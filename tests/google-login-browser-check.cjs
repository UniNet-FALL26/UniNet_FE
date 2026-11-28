const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.UNINET_PLAYWRIGHT_MODULE || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));

const root = path.resolve(process.env.GOOGLE_TEST_WEB_ROOT || '.expo/google-login-check');
const port = Number(process.env.GOOGLE_TEST_PORT || 8187);
const origin = `http://127.0.0.1:${port}`;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const server = http.createServer((request, response) => {
  let file = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, origin).pathname));
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  if (!path.extname(file)) file += '.html';
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).on('error', () => response.destroy()).pipe(response);
});

async function run() {
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  if (process.argv.includes('--serve')) { console.log(`Google login preview: ${origin}/login`); return; }
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'), headless: true });
  try {
    for (const width of [375, 1440]) {
      for (const mode of ['success', 'denied', 'cancel', 'retry']) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        try {
          const page = await context.newPage();
          const errors = [], exchanges = [];
          let scriptAttempts = 0;
          const account = { id: 'google-student-fixture', email: 'student@test.local', role: 0, profileComplete: true,
            profile: { id: 'profile-fixture', fullName: 'Student Fixture', displayName: 'Student Fixture', isVerified: true } };
          page.on('pageerror', error => errors.push(error.message));
          await page.route('https://accounts.google.com/gsi/client*', async route => {
            scriptAttempts++;
            if (mode === 'retry' && scriptAttempts === 1) return route.abort();
            return route.fulfill({ contentType: 'text/javascript', body: `
              window.google = { accounts: { id: {
                initialize(options) { this.receive = options.callback; },
                renderButton(element, options) {
                  const button = document.createElement('button');
                  button.textContent = 'Đăng nhập với Google';
                  button.style.cssText = 'height:44px;width:100%;background:white;border:1px solid #ccc;border-radius:4px';
                  button.onclick = () => { options.click_listener(); ${mode === 'cancel' ? '' : "this.receive({credential:'fixture-google-id-token'}); this.receive({credential:'fixture-google-id-token'});"} };
                  element.replaceChildren(button);
                }
              } } };` });
          });
          await page.route('**/api/**', async route => {
            const request = route.request(), pathname = new URL(request.url()).pathname;
            if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
            if (pathname === '/api/auth/google') {
              exchanges.push(request.postDataJSON());
              if (mode === 'denied') return route.fulfill({ status: 403, json: { code: 'GOOGLE_STUDENT_ONLY', message: 'Google sign-in is only available to students.' } });
              return route.fulfill({ json: { account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false } });
            }
            if (pathname === '/api/auth/me') return route.fulfill({ json: account });
            return route.fulfill({ json: { data: [], items: [], total: 0, unreadCount: 0 } });
          });
          await page.goto(origin + '/login?paymentReturn=resume');
          if (mode === 'retry') {
            await page.getByRole('button', { name: 'Thử lại đăng nhập Google' }).click();
          }
          await page.getByRole('button', { name: 'Đăng nhập với Google', exact: true }).click();
          if (mode === 'cancel') {
            assert.equal(exchanges.length, 0);
            assert.equal(new URL(page.url()).pathname, '/login');
            assert.equal(await page.getByRole('button', { name: 'Đăng nhập', exact: true }).isEnabled(), true);
          } else {
            if (mode === 'denied') {
              await page.getByText(/Đăng nhập Google chỉ dành cho sinh viên/).first().waitFor();
              assert.equal(new URL(page.url()).pathname, '/login');
            } else {
              await page.waitForURL('**/payment/result');
            }
            assert.equal(exchanges.length, 1, 'duplicate SDK callbacks must not exchange twice');
            assert.equal(exchanges[0].idToken, 'fixture-google-id-token');
            assert.equal(exchanges[0].role, 0);
            assert.ok(exchanges[0].deviceId);
          }
          assert.deepEqual(errors, []);
          console.log(`PASS ${width}px ${mode}`);
        } finally { await context.close(); }
      }
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error.message); server.close(); process.exitCode = 1; });
