const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/project-members.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: api });
const member = (userId, extra = {}) => ({ id: `member-${userId}`, userId, fullName: userId, avatarUrl: null, role: 'Developer', positionId: null, status: 0, joinedAt: '2026-11-17', ...extra });
const project = (members = [], extra = {}) => ({ id: 'project', creator: { id: 'owner-profile', fullName: 'Owner', avatarUrl: 'owner.png' }, createdAt: '2026-11-16', isOwner: true, members, ...extra });

test('empty owner project displays the owner with a correct active count', () => {
  const result = api.projectDisplayMembers(project(), 'owner-profile');
  assert.equal(result.length, 1);
  assert.equal(result[0].userId, 'owner-profile');
  assert.equal(result[0].role, 'Chủ dự án');
  assert.equal(result[0].avatarUrl, 'owner.png');
  assert.equal(result.filter(item => item.status === 0).length, 1);
});
test('moves self first without duplicating owner or changing records and other order', () => {
  const owner = member('owner-profile', { role: 'Team leader' });
  const source = project([member('a'), owner, member('b', { status: 2 }), member('viewer-profile')], { isOwner: false });
  const before = JSON.stringify(source);
  const result = api.projectDisplayMembers(source, 'viewer-profile');
  assert.equal(result.map(item => item.userId).join(','), 'viewer-profile,a,owner-profile,b');
  assert.equal(result.find(item => item.userId === 'owner-profile'), owner);
  assert.equal(result.filter(item => item.status === 0).length, 3);
  assert.equal(JSON.stringify(source), before);
});
test('does not fabricate a membership for a visitor or account ID', () => {
  const source = project([member('a')], { isOwner: false });
  for (const id of ['visitor', 'owner-account', undefined]) {
    const result = api.projectDisplayMembers(source, id);
    assert.equal(result.map(item => item.userId).join(','), 'owner-profile,a');
  }
});
test('owner flag still puts owner first when profile identity is unavailable', () => {
  const result = api.projectDisplayMembers(project([member('a'), member('owner-profile')]));
  assert.equal(result[0].userId, 'owner-profile');
});
