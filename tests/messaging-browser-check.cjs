// Real local API + SignalR + PostgreSQL. No API/notification mocks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(process.env.UNINET_CHAT_WEB_ROOT || path.join(__dirname, '../../.tmp/messaging/web'));
const fixture = JSON.parse(fs.readFileSync(process.env.UNINET_CHAT_FIXTURE || path.resolve(__dirname, '../../.tmp/messaging/fixture.json')));
const origin = 'http://localhost:8097', api = 'http://localhost:5169/api';
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  let requested = decodeURIComponent(new URL(req.url, origin).pathname); let file = path.resolve(root, '.' + requested);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); fs.createReadStream(file).pipe(res);
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, timeout = 15000) { const end = Date.now() + timeout; while (Date.now() < end) { if (await check()) return; await delay(200); } throw new Error('Condition did not become true'); }

(async () => {
  await new Promise(resolve => server.listen(8097, 'localhost', resolve));
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const errors = [], loginHydrationWarnings = [], sessions = [], checks = [];
  async function session(name, mobile = false) {
    const user = fixture.users.find(user => user.name === name);
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 900 } }); const page = await context.newPage(); page.setDefaultTimeout(20000);
    page.on('pageerror', error => {
      // Existing desktop AuthLayout branches on viewport width during static hydration.
      // Keep those login-only warnings visible; any messaging/runtime error still fails.
      if (new URL(page.url()).pathname.endsWith('/login') && error.message.includes('Minified React error #418')) loginHydrationWarnings.push(error.message);
      else errors.push(error.message);
    });
    await page.goto(origin + '/login');
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(user.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill(fixture.password);
    const result = page.waitForResponse(response => response.url() === api + '/auth/login' && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); const response = await result; assert.equal(response.status(), 200); const auth = await response.json();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    const request = async (route, method = 'GET', input) => {
      const response = await fetch(api + route, { method, headers: { Authorization: 'Bearer ' + auth.accessToken, ...(input && !(input instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: input instanceof FormData ? input : input ? JSON.stringify(input) : undefined });
      const body = response.status === 204 ? null : await response.json(); if (!response.ok) throw new Error(`${method} ${route}: ${response.status} ${JSON.stringify(body)}`); return body;
    };
    const send = async (conversation, text) => { const body = new FormData(); body.set('ClientMessageId', crypto.randomUUID()); body.set('Content', text); return await request(`/messaging/conversations/${conversation}/messages`, 'POST', body); };
    const value = { page, context, user, auth, request, send }; sessions.push(value); return value;
  }
  try {
    const alice = await session('Alice'), bob = await session('Bob'), bob2 = await session('Bob'), carol = await session('Carol', true);
    const direct = await alice.request(`/messaging/direct/${bob.user.profileId}`); assert.ok(direct.conversationId); const room = direct.conversationId;
    await alice.page.goto(origin + '/messages?profileId=' + fixture.users.find(user => user.name === 'Dan').profileId);
    await alice.page.getByRole('textbox', { name: 'Nhập tin nhắn', exact: true }).waitFor();
    assert.equal((await alice.request(`/messaging/direct/${fixture.users.find(user => user.name === 'Dan').profileId}`)).conversationId, null); checks.push('Preview does not create a stranger room');
    await Promise.all([alice.page.goto(origin + '/messages?conversationId=' + room), bob.page.goto(origin + '/messages?conversationId=' + fixture.groupId), bob2.page.goto(origin + '/messages?conversationId=' + room), carol.page.goto(origin + '/messages?conversationId=' + fixture.groupId)]);
    await Promise.all([alice, bob, bob2, carol].map(s => s.page.getByRole('textbox', { name: 'Nhập tin nhắn', exact: true }).waitFor()));
    const uiText = 'UI message across sessions ' + Date.now();
    await alice.page.getByRole('textbox', { name: 'Nhập tin nhắn', exact: true }).fill(uiText); await alice.page.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).click();
    await bob2.page.getByTestId('chat-message-history').getByText(uiText, { exact: true }).waitFor(); checks.push('UI send reaches another login session through SignalR');
    await bob.page.bringToFront(); await delay(500);
    const message = await alice.send(room, 'Foreground popup in another room');
    await bob.page.getByTestId('chat-message-notification').getByText('Foreground popup in another room', { exact: true }).waitFor();
    await bob2.page.getByTestId('chat-message-' + message.id).waitFor(); checks.push('Other room popup and multi-session delivery');
    await bob.page.getByTestId('chat-message-notification').getByRole('button', { name: /Mở tin nhắn/ }).click();
    await bob.page.getByTestId('chat-message-' + message.id).waitFor();
    await until(async () => (await bob.request('/messaging/unread-count')).count === 0); checks.push('Popup opens exact room; read count synchronizes');
    const typingVisible = bob.page.getByText(/Alice.*đang nhập/).waitFor();
    await alice.page.getByRole('textbox', { name: 'Nhập tin nhắn', exact: true }).pressSequentially('Typing...', { delay: 150 }); await typingVisible;
    await alice.page.getByRole('textbox', { name: 'Nhập tin nhắn', exact: true }).fill(''); checks.push('Typing event');
    await alice.request(`/messaging/messages/${message.id}`, 'PUT', { content: 'Edited over realtime' });
    await bob.page.getByTestId('chat-message-' + message.id).getByText('Edited over realtime', { exact: true }).waitFor();
    await bob.request(`/messaging/messages/${message.id}/reaction`, 'PUT', { reactionType: '👍' });
    await alice.page.getByTestId('chat-message-' + message.id).getByRole('button', { name: '👍 1 cảm xúc' }).waitFor();
    await alice.request(`/messaging/messages/${message.id}`, 'DELETE');
    await bob.page.getByTestId('chat-message-' + message.id).getByText('Tin nhắn đã được thu hồi', { exact: true }).waitFor(); checks.push('Edit, reaction and recall synchronize without reload');
    await bob2.context.setOffline(true); await delay(500); const offline = await alice.send(room, 'Recover after offline'); await bob2.context.setOffline(false);
    await bob2.page.getByTestId('chat-message-' + offline.id).waitFor({ timeout: 35000 }); checks.push('Reconnect resynchronizes history');
    const groupMessage = await alice.send(fixture.groupId, 'Group on mobile layout'); await carol.page.getByTestId('chat-message-' + groupMessage.id).waitFor();
    assert.equal(await carol.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    await carol.page.screenshot({ path: path.resolve(root, '../messaging-mobile.png') }); await alice.page.screenshot({ path: path.resolve(root, '../messaging-desktop.png') }); checks.push('Group realtime and compact mobile viewport');
    const outsider = await session('Dan'); const denied = await fetch(api + `/messaging/conversations/${fixture.groupId}/messages`, { headers: { Authorization: 'Bearer ' + outsider.auth.accessToken } }); assert.equal(denied.status, 403); checks.push('Non-member history rejected by backend');
    const expectedPush = process.env.UNINET_CHAT_EXPECT_PUSH === '1';
    assert.equal((await alice.request('/messaging/push/config')).enabled, expectedPush); checks.push('Firebase configuration matches the test environment');
    assert.deepEqual(errors, []); console.log(JSON.stringify({ checks, browserErrors: errors, existingDesktopLoginHydrationWarnings: loginHydrationWarnings.length }, null, 2));
  } catch (error) {
    for (let i = 0; i < sessions.length; i++) await sessions[i].page.screenshot({ path: path.resolve(root, `../failure-${i}.png`) }).catch(() => {});
    console.error(error); process.exitCode = 1;
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
