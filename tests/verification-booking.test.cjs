const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/${path}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, Intl, Date, require: key => { if (key in dependencies) return dependencies[key]; throw Error(key); } });
  return exports;
}
const rules = load('utils/verification-booking');
const detail = () => ({ verification: { status: 0, bookingStatus: 0, reservedUntil: null }, assignments: [], payments: [], meetingEndAt: null });
test('booking blocks paid, pending payment, manual review, legacy and every assignment', () => {
  assert.equal(rules.canChooseMeeting(detail()), true);
  for (const status of [0, 1]) { const d = detail(); d.payments = [{ status }]; assert.equal(rules.canChooseMeeting(d), false); }
  for (const status of [0, 1, 2, 3]) { const d = detail(); d.assignments = [{ status }]; assert.equal(rules.canChooseMeeting(d), false); }
  for (const bookingStatus of [2, 4, 5]) { const d = detail(); d.verification.bookingStatus = bookingStatus; assert.equal(rules.canChooseMeeting(d), false); }
  const d = detail(); d.payments = [{ status: 2, requiresManualReview: true }]; assert.equal(rules.canChooseMeeting(d), false);
  d.payments = []; d.meetingStartAt = '2026-10-21T01:00:00Z'; assert.equal(rules.canChooseMeeting(d), false);
});
test('reservation countdown uses server timestamp and never goes negative', () => {
  const d = detail(); d.verification.bookingStatus = 1; d.verification.reservedUntil = '2026-10-21T02:00:00Z';
  assert.equal(rules.holdSeconds(d, Date.parse('2026-10-21T01:58:30Z')), 90);
  assert.equal(rules.holdSeconds(d, Date.parse('2026-10-21T03:00:00Z')), 0);
});
test('slot dates use backend timezone across midnight', () => {
  assert.equal(rules.slotDate('2026-10-21T18:30:00Z', 'Asia/Ho_Chi_Minh'), '2026-10-22');
  assert.equal(rules.slotTime('2026-10-21T18:30:00Z', 'Asia/Ho_Chi_Minh'), '01:30');
});
test('service uses package filters and sends only backend slot timestamps', async () => {
  const calls = [];
  const service = load('services/project-verification.service', { '@/constants/config': { API_URL: 'https://example.test/api' }, '@/services/api': { apiRequest: async (path, options) => { calls.push({ path, options }); return {}; } } }).projectVerificationService;
  await service.packages(2);
  assert.match(calls[0].path, /^\/packages\?type=0&role=0&isActive=true&page=2/);
  await service.create('project', 'package');
  assert.deepEqual(JSON.parse(calls[1].options.body), { packageId: 'package' });
  await service.hold('verification', { startAt: 'start', endAt: 'end', remainingCapacity: 3 });
  assert.equal(calls[2].options.method, 'PUT');
  assert.deepEqual(JSON.parse(calls[2].options.body), { startAt: 'start', endAt: 'end' });
});
