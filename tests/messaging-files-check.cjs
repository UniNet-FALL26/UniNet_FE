// Optional real Cloudinary private-storage check. Set UNINET_CHAT_CLOUD_TEST=1.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
if (process.env.UNINET_CHAT_CLOUD_TEST !== '1') throw new Error('Explicit UNINET_CHAT_CLOUD_TEST=1 is required for real uploads.');
const fixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../.tmp/messaging/fixture.json')));
const api = 'http://localhost:5169/api';
const cloud = {};
for (const line of fs.readFileSync(path.resolve(__dirname, '../../UniNet_BE/.env'), 'utf8').split(/\r?\n/)) {
  const pair = line.match(/^(Cloudinary__[A-Za-z]+)=(.*)$/); if (pair) cloud[pair[1]] = pair[2].trim().replace(/^(["'])(.*)\1$/, '$2');
}
const cleanup = [];
async function login(name) { const user = fixture.users.find(user => user.name === name); const result = await fetch(api + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password: fixture.password }) }); assert.equal(result.status, 200); return await result.json(); }
async function request(auth, route, method = 'GET', body) { return await fetch(api + route, { method, headers: { Authorization: 'Bearer ' + auth.accessToken }, body }); }
(async () => {
  try {
    const alice = await login('Alice'), bob = await login('Bob'), outsider = await login('Dan');
    const direct = await (await request(alice, '/messaging/direct/' + fixture.users.find(user => user.name === 'Bob').profileId)).json();
    const form = new FormData(); form.set('ClientMessageId', crypto.randomUUID()); form.append('Files', new Blob(['Private fixture one'], { type: 'text/plain' }), 'first.txt'); form.append('Files', new Blob(['Private fixture two'], { type: 'text/plain' }), 'second.txt');
    const sent = await request(alice, `/messaging/conversations/${direct.conversationId}/messages`, 'POST', form); const message = await sent.json();
    assert.equal(sent.status, 200, JSON.stringify(message)); assert.equal(message.attachments.length, 2);
    for (const file of message.attachments) {
      const key = `uninet/chat/${alice.account.id.replaceAll('-', '')}/${file.id.replaceAll('-', '')}.txt`; cleanup.push(key);
      assert.match(file.fileUrl, /^\/messaging\/attachments\/[a-f0-9-]+\/content$/); assert.equal(file.storageKey, undefined);
      const download = await request(bob, file.fileUrl); assert.equal(download.status, 200); assert.equal(await download.text(), file.fileName === 'first.txt' ? 'Private fixture one' : 'Private fixture two');
      assert.match(download.headers.get('cache-control'), /no-store/);
      assert.equal((await request(outsider, file.fileUrl)).status, 403);
      assert.equal((await fetch(api + file.fileUrl)).status, 401);
      const unsigned = await fetch(`https://res.cloudinary.com/${cloud.Cloudinary__CloudName}/raw/authenticated/${key}`); assert.ok([401, 403, 404].includes(unsigned.status));
    }
    assert.equal((await request(alice, '/messaging/messages/' + message.id, 'DELETE')).status, 204);
    for (const file of message.attachments) assert.equal((await request(bob, file.fileUrl)).status, 410);
    console.log('Real multi-file upload, private signed download, membership checks, no unsigned access and recall passed.');
  } finally {
    for (const key of cleanup) {
      const timestamp = String(Math.floor(Date.now() / 1000)); const signature = crypto.createHash('sha256').update(`public_id=${key}&timestamp=${timestamp}&type=authenticated` + cloud.Cloudinary__ApiSecret).digest('hex');
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud.Cloudinary__CloudName}/raw/destroy`, { method: 'POST', body: new URLSearchParams({ public_id: key, timestamp, type: 'authenticated', api_key: cloud.Cloudinary__ApiKey, signature }) });
      if (!response.ok) throw new Error('Could not clean up a real test attachment.');
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
