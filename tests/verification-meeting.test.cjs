const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, Date, URL, require: name => imports[name] ?? require(name) });
  return exports;
}
const guards = load('src/types/verification-meeting.ts');
const { meetingState } = load('src/utils/verification-meeting.ts');
const a = '11111111-1111-4111-8111-111111111111';
const v = '22222222-2222-4222-8222-222222222222';
const metadata = () => ({ assignmentId: a, projectVerificationId: v, roomName: null, joinUrl: null, scheduledStartAt: '2026-11-01T02:00:00Z', scheduledEndAt: '2026-11-01T03:00:00Z', meetingStartAt: null, meetingEndAt: null });
const detail = () => ({ verification: { id: v, status: 0, bookingStatus: 2, bookingConfirmedAt: '2026-10-31T00:00:00Z', scheduledStartAt: '2026-11-01T02:00:00Z', scheduledEndAt: '2026-11-01T03:00:00Z' }, assignments: [{ id: 'old', status: 1 }, { id: a, status: 2 }], payments: [], meetingEndAt: null });
test('selects exactly one active assignment; checks booking, review, schedule, history', () => {
  const now = Date.parse('2026-11-01T02:00:00Z');
  let d = detail();
  assert.equal(meetingState(d, null, now).assignment.id, a);
  assert.equal(meetingState(d, null, now).canJoin, true);
  assert.equal(meetingState(d, null, now - 1).canJoin, false);
  // Scheduled end is not a business end.
  assert.equal(meetingState(d, null, now + 86400000).canJoin, true);
  for (const mutate of [
    d => d.assignments.push({ id: 'other', status: 0 }),
    d => d.assignments[1].status = 3,
    d => d.verification.bookingStatus = 1,
    d => d.verification.bookingConfirmedAt = null,
    d => d.payments.push({ status: 1, requiresManualReview: true }),
    d => d.meetingEndAt = '2026-11-01T02:30:00Z',
    d => d.verification.status = 3,
    d => d.finalResult = { reports: [] },
    d => d.assignments[0].report = {},
    d => d.verification.scheduledEndAt = 'invalid',
  ]) { d = detail(); mutate(d); assert.equal(meetingState(d, null, now).canJoin, false); }
  assert.equal(meetingState(detail(), { ...metadata(), meetingEndAt: '2026-11-01T02:30:00Z' }, now).canJoin, false);
});
test('validates context IDs, nullable dates and safe URLs before opening', () => {
  assert.equal(guards.validateMeeting(metadata(), a, v).roomName, null);
  for (const patch of [{ assignmentId: v }, { projectVerificationId: a }, { meetingEndAt: undefined }, { scheduledStartAt: '2026-11-01' }, { roomName: 5 }, { joinUrl: 'http://meet.example/room' }]) {
    assert.throws(() => guards.validateMeeting({ ...metadata(), ...patch }, a, v));
  }
  for (const url of ['javascript:alert(1)', 'https://user:pass@meet.example/room', null, 'http://meet.example/room']) assert.throws(() => guards.safeMeetingUrl(url));
  assert.throws(() => guards.validateMeeting({ assignmentId: a, projectVerificationId: v, joinUrl: null }, a, v, true));
});
test('student API uses assignmentId, supports both API prefixes and sends no body', async () => {
  for (const origin of ['https://api.example', 'https://api.example/api']) {
    const calls = [];
    const service = load('src/services/verification-meeting.service.ts', {
      '@/constants/config': { API_URL: origin },
      '@/types/verification-meeting': guards,
      '@/services/api': { apiRequest: async (path, options) => {
        calls.push({ path, options });
        return path.endsWith('/join') ? { assignmentId: a, projectVerificationId: v, joinUrl: 'https://meet.example/room' } : metadata();
      } },
    }).verificationMeetingService;
    const signal = new AbortController().signal;
    await service.get(a, v, signal); await service.create(a, v, signal); await service.join(a, v, signal);
    const prefix = origin.endsWith('/api') ? '' : '/api';
    assert.deepEqual(calls.map(c => c.path), [`${prefix}/assignments/${a}/meeting`, `${prefix}/assignments/${a}/meeting`, `${prefix}/assignments/${a}/meeting/join`]);
    assert.deepEqual(calls.map(c => c.options.method), ['GET', 'POST', 'POST']);
    assert.ok(calls.every(c => c.options.body === undefined && c.options.signal === signal));
    assert.equal(service.start, undefined); assert.equal(service.end, undefined);
    await assert.rejects(service.get('bad', v));
  }
});
test('meeting errors are translated without changing unrelated routes', () => {
  const { localizeProjectError: translate } = load('src/services/project-errors.ts');
  for (const code of ['ASSIGNMENT_LOCKED', 'VERIFICATION_LOCKED', 'BOOKING_NOT_CONFIRMED', 'JITSI_NOT_CONFIGURED', 'MEETING_CONFLICT']) {
    assert.notEqual(translate(`/api/assignments/${a}/meeting`, 'POST', 409, code, 'English error'), 'English error');
  }
  assert.match(translate(`/assignments/${a}/meeting`, 'GET', 403, 'FORBIDDEN', 'Forbidden'), /không có quyền/);
  assert.equal(translate('/unrelated', 'GET', 503, 'JITSI_NOT_CONFIGURED', 'unchanged'), 'unchanged');
});
function hookHarness({ dossier, room, joinRoom, createRoom, openURL } = {}) {
  let focus, cleanup;
  const state = [];
  const timers = new Map();
  let timerId = 0;
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useVerificationMeeting.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date, URL, AbortController,
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
    require: name => ({
      react: { useCallback: fn => fn, useRef: value => ({ current: value }), useState: initial => { const index = state.length; state.push(initial); return [initial, value => { state[index] = value; }]; } },
      'react-native': { Platform: { OS: 'android' }, AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
      'expo-router': { useFocusEffect: fn => { focus = fn; } },
      'expo-linking': { openURL: openURL ?? (async () => {}) },
      '@/store/auth.store': { useAuthStore: () => ({ account: { id: 'student' } }) },
      '@/services/api': { ApiError: class ApiError extends Error { constructor(message, status, code) { super(message); this.status = status; this.code = code; } } },
      '@/services/project-verification.service': { projectVerificationService: { detail: dossier ?? (async () => detail()) } },
      '@/services/verification-meeting.service': { verificationMeetingService: { get: room ?? (async () => metadata()), create: createRoom ?? (async () => ({ ...metadata(), roomName: 'room' })), join: joinRoom ?? (async () => ({ assignmentId: a, projectVerificationId: v, joinUrl: 'https://meet.example/room' })) } },
      '@/types/verification-meeting': guards,
      '@/utils/verification-meeting': { meetingState },
    })[name],
  });
  const hook = exports.useVerificationMeeting(v);
  cleanup = focus();
  return { hook, state, timers, cleanup };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
test('coordinator refreshes before create/join, locks duplicate clicks and opens only a validated URL', async () => {
  const calls = [];
  let release;
  const h = hookHarness({
    dossier: async () => { calls.push('detail'); return detail(); },
    room: async () => { calls.push('get'); return metadata(); },
    createRoom: () => { calls.push('create'); return new Promise(resolve => { release = () => resolve({ ...metadata(), roomName: 'room' }); }); },
    joinRoom: async () => { calls.push('join'); return { joinUrl: 'https://meet.example/room' }; },
    openURL: async url => { calls.push(url); },
  });
  await flush();
  const first = h.hook.join();
  await flush();
  await h.hook.join();
  assert.deepEqual(calls, ['detail', 'get', 'detail', 'get', 'create']);
  release(); await first;
  assert.deepEqual(calls.slice(-2), ['join', 'https://meet.example/room']);
  assert.equal(h.timers.size, 1);
  h.cleanup(); assert.equal(h.timers.size, 0);
});
test('blur aborts pending mutations and prevents opening a room', async () => {
  let release, opened = false, joined = false;
  const h = hookHarness({
    createRoom: () => new Promise(resolve => { release = () => resolve({ ...metadata(), roomName: 'room' }); }),
    joinRoom: async () => { joined = true; return { joinUrl: 'https://meet.example/room' }; },
    openURL: async () => { opened = true; },
  });
  await flush();
  const pending = h.hook.join(); await flush();
  h.cleanup(); release(); await pending;
  assert.equal(joined, false); assert.equal(opened, false); assert.equal(h.timers.size, 0);
});
test('final dossier stops polling and never reads meeting endpoints', async () => {
  let reads = 0;
  const h = hookHarness({ dossier: async () => ({ ...detail(), verification: { ...detail().verification, status: 1 } }), room: async () => { reads++; return metadata(); } });
  await flush(); assert.equal(reads, 0); assert.equal(h.timers.size, 0); h.cleanup();
});
