const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript'), vm = require('node:vm');
const calls = [], exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/friendship.service.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
  exports: exportsObject, URLSearchParams,
  require: name => name === '@/constants/config' ? { API_URL: 'https://api.test/api' } : { apiRequest: async (...args) => { calls.push(args); return {}; } },
});
const api = exportsObject.friendshipService;
test('friend lists are paged and project candidate filters use the existing project id', async () => {
  await api.list('friends', 'a b', 2, undefined, 'project');
  assert.match(calls.at(-1)[0], /^\/friendships\?q=a\+b&page=2&pageSize=20&projectId=project$/);
  await api.list('received'); assert.match(calls.at(-1)[0], /requests\/received/);
});
test('friend requests send account id while relation lookup uses profile id', async () => {
  await api.send('receiver-account'); assert.deepEqual(JSON.parse(calls.at(-1)[1].body), { receiverAccountId: 'receiver-account' });
  await api.relationship('public-profile'); assert.equal(calls.at(-1)[0], '/friendships/relationship/public-profile');
});
test('actions include expected version; remove uses DELETE and missing state is rejected', async () => {
  await api.decide({ friendshipId: 'relation', friendshipVersion: 3 }, 'accept');
  assert.equal(calls.at(-1)[0], '/friendships/relation/accept'); assert.equal(JSON.parse(calls.at(-1)[1].body).version, 3);
  await api.decide({ friendshipId: 'relation', friendshipVersion: 4 }, 'remove'); assert.equal(calls.at(-1)[1].method, 'DELETE');
  assert.throws(() => api.decide({ friendshipId: null }, 'accept'));
});
