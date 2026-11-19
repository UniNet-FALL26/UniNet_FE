const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, URLSearchParams, AbortController, setTimeout, clearTimeout, ...globals, require: name => { if (name in imports) return imports[name]; throw Error(name); } });
  return exports;
}
const utils = load('src/utils/assessor-onboarding.ts');
test('fragment-only onboarding credentials and one-use native handoff', () => {
  const token = 'A'.repeat(43);
  assert.equal(utils.onboardingLink(`https://example.org/assessor-onboarding/profile.html#token=${token}`).token, token);
  assert.equal(utils.onboardingLink(`https://example.org/assessor-onboarding/profile?token=${token}`).token, '');
  utils.captureOnboardingLink(`uninet:///assessor-onboarding/contract.html#token=${token}`);
  assert.equal(utils.consumeOnboardingLink('contract'), token);
  assert.equal(utils.consumeOnboardingLink('contract'), '');
});
test('profile preserves numeric identifiers and enforces backend patterns', () => {
  const profile = { fullName: ' Nguyễn A ', citizenId: '012345678901', taxCode: '0123456789', bankName: 'Bank', bankAccountNumber: '0012345', bankAccountHolder: 'NGUYEN A' };
  for (const taxCode of ['0123456789', '0123456789123', '0123456789-123']) assert.equal(Object.keys(utils.validateProfile({ ...profile, taxCode })).length, 0);
  assert.ok(utils.validateProfile({ ...profile, bankAccountNumber: '001 2345' }).bankAccountNumber);
  assert.ok(utils.validateProfile({ ...profile, fullName: '   ' }).fullName);
  assert.equal(utils.validOtp('012345'), true);
  assert.equal(utils.validOtp('12345'), false);
  assert.equal(utils.validPassword('abcdefgh1'), true);
  assert.equal(utils.validPassword('abcdefgh'), false);
});
test('public client omits credentials, handles empty 202, binary and empty rate limit', async () => {
  const calls = [];
  let reply = { ok: true, status: 202, headers: new Headers(), json() { throw Error('must not parse'); } };
  const { assessorOnboardingService: api, OnboardingError } = load('src/services/assessor-onboarding.service.ts', { '@/constants/config': { API_URL: 'https://api.example.org/api' } }, { fetch: async (url, options) => { calls.push({ url, options }); return reply; } });
  await api.requestReadOtp('A'.repeat(43));
  assert.equal(calls[0].url, 'https://api.example.org/api/assessor-onboarding/contract/read-otp');
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.equal(calls[0].options.cache, 'no-store');
  const pdf = new Blob(['%PDF'], { type: 'application/pdf' });
  reply = { ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/pdf' }), blob: async () => pdf };
  assert.equal(await api.getContractPdf('read-session'), pdf);
  reply = { ok: false, status: 429, headers: new Headers({ 'Retry-After': '120' }), json: async () => { throw Error('empty'); } };
  await assert.rejects(api.requestSignOtp('read-session'), error => error instanceof OnboardingError && error.status === 429 && error.retryAfter === 120);
});

