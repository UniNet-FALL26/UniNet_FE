const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText,
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
class TestApiError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code; }
}
function hookHarness({ dossier, room, joinRoom, createRoom, openURL, web = false, popup = () => null, time = Date.parse('2026-11-01T02:00:00Z') } = {}) {
  let focus, cleanup;
  const state = [];
  const timers = new Map();
  const deadlines = new Map();
  const events = {};
  const appState = { currentState: 'active', addEventListener: (_, fn) => { events.app = fn; return { remove() { delete events.app; } }; } };
  const document = { visibilityState: 'visible', addEventListener: (_, fn) => { events.visibility = fn; }, removeEventListener: () => { delete events.visibility; } };
  const window = { open: popup, addEventListener: (_, fn) => { events.focus = fn; }, removeEventListener: () => { delete events.focus; } };
  class Clock extends Date { static now() { return time; } }
  let timerId = 0;
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useVerificationMeeting.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date: Clock, Error, URL, AbortController, document, window,
    setTimeout: (fn, delay) => { timers.set(++timerId, fn); deadlines.set(timerId, time + delay); return timerId; }, clearTimeout: id => { timers.delete(id); deadlines.delete(id); },
    require: name => ({
      react: { useCallback: fn => fn, useRef: value => ({ current: value }), useState: initial => { const index = state.length; state.push(initial); return [initial, value => { state[index] = value; }]; } },
      'react-native': { Platform: { OS: web ? 'web' : 'android' }, AppState: appState },
      'expo-router': { useFocusEffect: fn => { focus = fn; } },
      'expo-linking': { openURL: openURL ?? (async () => {}) },
      '@/store/auth.store': { useAuthStore: () => ({ account: { id: 'student' } }) },
      '@/services/api': { ApiError: TestApiError },
      '@/services/project-verification.service': { projectVerificationService: { detail: dossier ?? (async () => detail()) } },
      '@/services/verification-meeting.service': { verificationMeetingService: { get: room ?? (async () => metadata()), create: createRoom ?? (async () => ({ ...metadata(), roomName: 'room' })), join: joinRoom ?? (async () => ({ assignmentId: a, projectVerificationId: v, joinUrl: 'https://meet.example/room' })) } },
      '@/types/verification-meeting': guards,
      '@/utils/verification-meeting': { meetingState: (d, m, now = Clock.now()) => meetingState(d, m, now) },
    })[name],
  });
  const hook = exports.useVerificationMeeting(v);
  cleanup = focus();
  return { hook, state, timers, cleanup,
    background() { appState.currentState = 'background'; events.app?.(); },
    foreground() { appState.currentState = 'active'; events.app?.(); },
    focus() { events.focus?.(); },
    hide() { document.visibilityState = 'hidden'; events.visibility?.(); },
    show() { document.visibilityState = 'visible'; events.visibility?.(); },
    advance(ms) {
      const target = time + ms;
      while (true) {
        const entry = [...deadlines].filter(([, due]) => due <= target).sort((x, y) => x[1] - y[1])[0];
        if (!entry) break;
        const [id, due] = entry;
        const fn = timers.get(id);
        timers.delete(id); deadlines.delete(id); time = due; fn();
      }
      time = target;
    },
  };
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
test('countdown ticks locally and unlocks at scheduled start without another API request', async () => {
  let reads = 0;
  const start = Date.parse(detail().verification.scheduledStartAt);
  const h = hookHarness({ time: start - 1500, dossier: async () => { reads++; return detail(); } });
  await flush();
  assert.equal(meetingState(h.state[0].detail, h.state[0].meeting, h.state[5]).waitingSeconds, 2);
  h.advance(1000);
  assert.equal(meetingState(h.state[0].detail, h.state[0].meeting, h.state[5]).canJoin, false);
  h.advance(500);
  assert.equal(meetingState(h.state[0].detail, h.state[0].meeting, h.state[5]).canJoin, true);
  assert.equal(reads, 1);
  h.cleanup();
});
test('early join cannot create a room, and existing rooms skip create', async () => {
  let creates = 0, joins = 0, opens = 0;
  const options = { createRoom: async () => { creates++; return metadata(); }, joinRoom: async () => { joins++; return { joinUrl: 'https://meet.example/room' }; }, openURL: async () => { opens++; } };
  const early = hookHarness({ ...options, time: Date.parse(detail().verification.scheduledStartAt) - 1 });
  await flush(); await early.hook.join();
  assert.equal(creates + joins + opens, 0); early.cleanup();
  const active = hookHarness({ ...options, room: async () => ({ ...metadata(), roomName: 'existing', meetingStartAt: '2026-11-01T02:00:00Z' }) });
  await flush(); await active.hook.join();
  assert.equal(creates, 0); assert.equal(joins, 1); assert.equal(opens, 1); active.cleanup();
});
test('background clears countdown and polling; foreground refreshes and resumes the clock', async () => {
  let reads = 0;
  const h = hookHarness({ time: Date.parse(detail().verification.scheduledStartAt) - 20000, dossier: async () => { reads++; return detail(); } });
  await flush(); assert.equal(h.timers.size, 2);
  h.background(); assert.equal(h.timers.size, 0);
  h.advance(25000); assert.equal(reads, 1);
  h.foreground(); await flush(); assert.equal(reads, 2);
  assert.equal(meetingState(h.state[0].detail, h.state[0].meeting, h.state[5]).canJoin, true);
  h.cleanup();
});
test('a request finishing in background does not restart polling and return during a request is queued', async () => {
  let release, reads = 0;
  const h = hookHarness({ dossier: () => { reads++; return reads === 1 ? new Promise(resolve => { release = resolve; }) : Promise.resolve(detail()); } });
  h.background(); release(detail()); await flush(); assert.equal(h.timers.size, 0);
  h.foreground(); await flush(); assert.equal(reads, 2); assert.equal(h.timers.size, 1); h.cleanup();
  reads = 0;
  const queued = hookHarness({ dossier: () => { reads++; return reads === 1 ? new Promise(resolve => { release = resolve; }) : Promise.resolve(detail()); } });
  queued.background(); queued.foreground(); release(detail()); await flush();
  assert.equal(reads, 2); assert.equal(queued.timers.size, 1); queued.cleanup();
});
test('ended metadata stops polling; returning still refreshes dossier to discover the report', async () => {
  let reads = 0;
  const h = hookHarness({ dossier: async () => { reads++; return reads > 1 ? { ...detail(), finalResult: { reports: [] } } : detail(); }, room: async () => ({ ...metadata(), meetingEndAt: '2026-11-01T02:10:00Z' }) });
  await flush(); assert.equal(h.timers.size, 0);
  assert.equal(meetingState(h.state[0].detail, h.state[0].meeting).canJoin, false);
  h.background(); h.foreground(); await flush();
  assert.equal(meetingState(h.state[0].detail, h.state[0].meeting).result, true);
  assert.equal(h.timers.size, 0); h.cleanup();
});
test('401/403 clear data and prevent polling, retries and foreground reloads', async () => {
  for (const status of [401, 403]) {
    let reads = 0;
    const h = hookHarness({ dossier: async () => { reads++; if (reads > 1) throw new TestApiError('Không có quyền', status); return detail(); } });
    await flush(); h.hook.refresh(); await flush();
    assert.equal(h.state[0], null); assert.equal(h.timers.size, 0);
    h.hook.refresh(); await h.hook.join(); h.background(); h.foreground(); await flush();
    assert.equal(reads, 2); h.cleanup();
  }
});
test('repeated API failures stop after three attempts and manual refresh retries', async () => {
  let reads = 0;
  const h = hookHarness({ dossier: async () => { reads++; throw new TestApiError('Mất mạng', 503); } });
  await flush(); h.advance(12000); await flush(); h.advance(12000); await flush();
  assert.equal(reads, 3); assert.equal(h.timers.size, 0);
  h.hook.refresh(); await flush(); assert.equal(reads, 4); h.cleanup();
});
test('blocked popup (null or thrown) is retryable without create or join mutations', async () => {
  for (const blocked of [() => null, () => { throw new Error('blocked'); }]) {
    let attempt = 0, creates = 0, joins = 0, target;
    const tab = { opener: {}, closed: false, close() { this.closed = true; }, location: { replace(url) { target = url; } } };
    const h = hookHarness({ web: true, popup: () => ++attempt === 1 ? blocked() : tab,
      createRoom: async () => { creates++; return { ...metadata(), roomName: 'room' }; },
      joinRoom: async () => { joins++; return { joinUrl: 'https://meet.example/room' }; },
    });
    await flush(); await h.hook.join();
    assert.match(h.state[1], /chặn cửa sổ/); assert.equal(creates + joins, 0);
    await h.hook.join(); assert.equal(target, 'https://meet.example/room'); assert.equal(tab.opener, null); assert.equal(tab.closed, false);
    h.hide(); assert.equal(h.timers.size, 0); h.show(); await flush(); h.focus(); await flush();
    h.cleanup(); assert.equal(tab.closed, false);
  }
});
test('API errors close prepared popup and never navigate to a room', async () => {
  let navigated = false;
  const tab = { closed: false, close() { this.closed = true; }, location: { replace() { navigated = true; } } };
  const h = hookHarness({ web: true, popup: () => tab, joinRoom: async () => { throw new TestApiError('Dịch vụ phòng họp chưa sẵn sàng', 503, 'JITSI_NOT_CONFIGURED'); } });
  await flush(); await h.hook.join();
  assert.equal(tab.closed, true); assert.equal(navigated, false); assert.match(h.state[1], /chưa sẵn sàng/); assert.equal(h.state[4], false); h.cleanup();
});
test('native browser failure has an actionable error and allows another join', async () => {
  let opens = 0;
  const h = hookHarness({ openURL: async () => { if (++opens === 1) throw new Error('Native internal error'); } });
  await flush(); await h.hook.join(); assert.match(h.state[1], /Không thể mở trình duyệt/);
  assert.ok(h.state[0]); assert.equal(h.state[4], false);
  await h.hook.join(); assert.equal(opens, 2); assert.equal(h.state[1], null); assert.match(h.state[2], /Rời phòng không kết thúc/); h.cleanup();
});
test('closed or unnavigable web tab produces a retryable error without a success notice', async () => {
  for (const closed of [true, false]) {
    const tab = { closed, close() { this.closed = true; }, location: { replace() { throw new Error('Navigation failed'); } } };
    const h = hookHarness({ web: true, popup: () => tab });
    await flush(); await h.hook.join();
    assert.match(h.state[1], closed ? /đã đóng/ : /Không thể mở phòng họp/);
    assert.equal(h.state[2], null); assert.equal(h.state[4], false); assert.equal(tab.closed, true); h.cleanup();
  }
});
test('room-required recovery is bounded and permission failures during join never open a link', async () => {
  let creates = 0, joins = 0;
  const h = hookHarness({ room: async () => ({ ...metadata(), roomName: 'existing' }), createRoom: async () => { creates++; return metadata(); }, joinRoom: async () => { joins++; throw new TestApiError('Thiếu phòng', 409, 'MEETING_ROOM_REQUIRED'); } });
  await flush(); await h.hook.join(); assert.equal(creates, 1); assert.equal(joins, 2); h.cleanup();
  let opened = false;
  const denied = hookHarness({ joinRoom: async () => { throw new TestApiError('Không có quyền', 403); }, openURL: async () => { opened = true; } });
  await flush(); await denied.hook.join();
  assert.equal(opened, false); assert.equal(denied.state[0], null); assert.equal(denied.timers.size, 0); denied.cleanup();
});
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function renderMeeting(values) {
  const div = ({ children }) => React.createElement('div', null, children);
  const screen = load('src/components/projects/VerificationMeetingScreen.tsx', {
    '@/components/ui/Button': { Button: ({ title, disabled }) => React.createElement('button', { disabled }, title) },
    '@/hooks/useVerificationMeeting': { useVerificationMeeting: () => ({ detail: detail(), meeting: metadata(), now: Date.parse('2026-11-01T02:00:00Z'), refresh() {}, join() {}, ...values }) },
    '@/utils/verification-meeting': load('src/utils/verification-meeting.ts'),
    'expo-router': { router: {}, useLocalSearchParams: () => ({ id: v }) },
    'react-native': { Text: div },
    './VerificationDossierUI': { DossierLayout: div, DossierCard: div, ds: {}, verificationDate: value => value ?? 'Chưa có' },
  }).VerificationMeetingScreen;
  return renderToStaticMarkup(React.createElement(screen));
}
test('screen renders countdown, join/rejoin, waiting report and results without student controls', () => {
  const early = renderMeeting({ now: Date.parse('2026-11-01T01:59:59Z') });
  assert.match(early, /Còn 00:00:01/); assert.match(early, /disabled=""/); assert.match(early, /UTC\+7/);
  assert.match(renderMeeting({}), /Chuẩn bị và tham gia/);
  assert.match(renderMeeting({ meeting: { ...metadata(), meetingStartAt: '2026-11-01T02:00:00Z' } }), /Tham gia lại/);
  const ended = renderMeeting({ meeting: { ...metadata(), meetingEndAt: '2026-11-01T02:30:00Z' } });
  assert.match(ended, /Đang chờ chuyên gia nộp báo cáo/); assert.doesNotMatch(ended, /Chuẩn bị và tham gia|Tham gia lại/);
  const result = renderMeeting({ detail: { ...detail(), finalResult: { reports: [] } } });
  assert.match(result, /Xem báo cáo cấp 2/); assert.doesNotMatch(result, /Chuẩn bị và tham gia|Tham gia lại/);
  const recoverable = renderMeeting({ error: 'Popup đã bị chặn' });
  assert.doesNotMatch(recoverable, /disabled=""/);
  assert.match(recoverable, /Đóng tab Jitsi hoặc rời phòng không kết thúc/);
  assert.doesNotMatch(recoverable, /<button[^>]*>Bắt đầu|<button[^>]*>Kết thúc/);
});
