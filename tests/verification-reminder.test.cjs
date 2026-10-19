const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/verification-reminder.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject });
const { verificationReminder } = exportsObject;
const created = '2026-10-17T03:00:00Z';

test('registration day is silent; following Vietnam calendar days count down 3, 2, 1', () => {
  assert.equal(verificationReminder(created, false, Date.parse('2026-10-17T16:59:59Z')), null);
  for (const [day, remaining] of [[17, 3], [18, 2], [19, 1]]) {
    assert.equal(verificationReminder(created, false, Date.parse(`2026-10-${day}T17:00:00Z`)), `Còn ${remaining} ngày, vui lòng xác minh tài khoản.`);
  }
});
test('verified, missing, invalid and future registrations do not show warnings', () => {
  const now = Date.parse('2026-10-18T03:00:00Z');
  assert.equal(verificationReminder(created, true, now), null);
  for (const value of [undefined, null, '', 'invalid', '2099-01-01T00:00:00Z']) assert.equal(verificationReminder(value, false, now), null);
});
test('overdue accounts receive a request without a negative countdown or invented penalty', () => {
  for (const now of ['2026-10-20T17:00:00Z', '2027-01-01T00:00:00Z']) assert.equal(verificationReminder(created, false, Date.parse(now)), 'Vui lòng xác minh tài khoản.');
});
test('calendar countdown handles year changes and registrations immediately before midnight', () => {
  assert.equal(verificationReminder('2026-12-31T16:59:59Z', false, Date.parse('2026-12-31T17:00:00Z')), 'Còn 3 ngày, vui lòng xác minh tài khoản.');
});
