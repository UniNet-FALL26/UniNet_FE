const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(name, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/${name}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, FormData, File, require: dependency => {
    if (dependency in dependencies) return dependencies[dependency];
    throw new Error(`Unexpected dependency: ${dependency}`);
  } });
  return exports;
}
const rules = load('utils/student-verification');
test('all four verification states and a legacy verified profile map to server-driven labels', () => {
  for (const [status, isVerified, label] of [[null, false, 'Chưa xác minh'], [0, false, 'Đang xét duyệt'], [1, true, 'Đã xác minh'], [2, false, 'Cần bổ sung'], [null, true, 'Đã xác minh']]) assert.equal(rules.verificationPresentation({ status, isVerified }).label, label);
});
test('required fields and student identifier validate without a school whitelist', () => {
  assert.equal(Object.keys(rules.validateStudentVerification({ fullName: '', schoolName: '', studentCode: '' })).length, 3);
  assert.equal(Object.keys(rules.validateStudentVerification({ fullName: 'Nguyễn Mai An', schoolName: 'Đại học Bách khoa', studentCode: 'SV-2026_001/A' })).length, 0);
  for (const code of ['ab', 'x'.repeat(51), '<script>', 'student code']) assert.ok(rules.validateStudentVerification({ fullName: 'An', schoolName: 'Trường bất kỳ', studentCode: code }).studentCode);
});
test('document guard rejects empty, oversized, mismatched and unsupported files', () => {
  for (const file of [{ name: 'a.txt', mimeType: 'text/plain', size: 10 }, { name: 'a.png', mimeType: 'image/png', size: 0 }, { name: 'a.png', mimeType: 'image/png', size: 5 * 1024 * 1024 + 1 }, { name: 'a.pdf', mimeType: 'image/png', size: 10 }]) assert.ok(rules.validateVerificationDocument(file));
  for (const [name, mimeType] of [['a.JPG', 'image/jpeg'], ['a.png', 'image/png'], ['a.pdf', 'application/pdf']]) assert.equal(rules.validateVerificationDocument({ name, mimeType, size: 5 * 1024 * 1024 }), null);
});
test('service submits only the owned form fields and document as multipart; no client user ID or approval status', async () => {
  const calls = [];
  const api = load('services/student-verification.service', {
    '@/services/api': { apiRequest: async (path, options) => { calls.push({ path, options }); return { id: 'request', status: 0, isVerified: false, fullName: 'An', schoolName: 'School', studentCode: 'SV01', submittedAt: null, reviewedAt: null, rejectReason: null, documentName: 'student.pdf' }; } },
    '@/utils/student-verification': rules,
    'react-native': { Platform: { OS: 'web' } },
    'expo-file-system': { File: class {} },
  }).studentVerificationService;
  const file = new File(['test'], 'student.pdf', { type: 'application/pdf' });
  const controller = new AbortController();
  await api.submit({ fullName: ' An ', schoolName: ' School ', studentCode: ' SV01 ' }, { file, name: file.name, mimeType: file.type, size: file.size, uri: 'blob:test' }, controller.signal);
  assert.equal(calls[0].path, '/student/verification');
  assert.deepEqual([...calls[0].options.body.keys()], ['fullName', 'schoolName', 'studentCode', 'document']);
  assert.equal(calls[0].options.body.get('fullName'), 'An');
  assert.equal(calls[0].options.signal, controller.signal);
  assert.equal(calls[0].options.body.get('document').name, 'student.pdf');
  assert.equal(calls[0].options.headers, undefined);
});

test('malformed server state never appears as an unverified account eligible for submission', async () => {
  for (const value of [[], {}, { status: 0, isVerified: 'false' }]) {
    const api = load('services/student-verification.service', { '@/services/api': { apiRequest: async () => value }, '@/utils/student-verification': rules, 'react-native': { Platform: { OS: 'web' } }, 'expo-file-system': { File: class {} } }).studentVerificationService;
    await assert.rejects(api.get(), /trạng thái xác minh hợp lệ/);
  }
});
