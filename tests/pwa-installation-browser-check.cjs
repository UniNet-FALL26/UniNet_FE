const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.UNINET_PLAYWRIGHT_MODULE || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = path.resolve(process.env.PWA_TEST_WEB_ROOT || '.expo/pwa-check');
const port = Number(process.env.PWA_TEST_PORT || 8193);
const origin = `http://127.0.0.1:${port}`;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const server = http.createServer((request, response) => {
  let file = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, origin).pathname));
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  if (file === root) file = path.join(root, 'index.html');
  else if (!path.extname(file)) file += '.html';
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  response.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(file).on('error', () => response.destroy()).pipe(response);
});

async function fixturePrompt(page, outcome) {
  await page.evaluate(outcome => {
    window.__pwaPrompts = 0;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, { prompt: async () => { window.__pwaPrompts++; }, userChoice: Promise.resolve({ outcome }) });
    window.dispatchEvent(event);
  }, outcome);
}

async function run() {
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  if (process.argv.includes('--serve')) { console.log(`PWA preview: ${origin}/`); return; }
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'), headless: true });
  try {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 960 }, reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto(origin + '/');
        await page.getByRole('button', { name: 'Cài UniNet', exact: true }).waitFor();
        const manifestUrl = await page.locator('link[rel=manifest]').getAttribute('href');
        assert.equal(manifestUrl, '/manifest.webmanifest');
        assert.equal(await page.locator('html').getAttribute('lang'), 'vi');
        const manifest = await (await context.request.get(origin + manifestUrl)).json();
        assert.equal(manifest.display, 'standalone');
        const worker = await page.evaluate(async () => {
          const registration = await navigator.serviceWorker.ready;
          return { scope: registration.scope, script: registration.active.scriptURL };
        });
        assert.equal(worker.scope, origin + '/');
        assert.ok(worker.script.endsWith('/pwa-sw.js'));
        const cdp = await context.newCDPSession(page);
        const appManifest = await cdp.send('Page.getAppManifest');
        assert.deepEqual(appManifest.errors, []);
        const eligibility = await cdp.send('Page.getInstallabilityErrors');
        assert.deepEqual(eligibility.installabilityErrors.filter(error => error.errorId !== 'in-incognito'), []);
        await cdp.detach();
        const registrations = await page.evaluate(async () => {
          await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/firebase-cloud-messaging-push-scope' });
          return (await navigator.serviceWorker.getRegistrations()).map(registration => registration.scope);
        });
        assert.ok(registrations.includes(origin + '/'));
        assert.ok(registrations.some(scope => scope.includes('firebase-cloud-messaging-push-scope')));
        fs.mkdirSync('.expo/pwa-artifacts', { recursive: true });
        await page.screenshot({ path: `.expo/pwa-artifacts/welcome-${width}.png`, fullPage: true, animations: 'disabled', timeout: 5000 });
        await fixturePrompt(page, 'dismissed');
        await page.getByRole('button', { name: 'Cài UniNet', exact: true }).click();
        await page.getByText('Bạn có thể cài UniNet sau từ menu trình duyệt.').waitFor();
        assert.equal(await page.evaluate(() => window.__pwaPrompts), 1);
        await fixturePrompt(page, 'accepted');
        await page.getByRole('button', { name: 'Cài UniNet', exact: true }).click();
        assert.equal(await page.evaluate(() => window.__pwaPrompts), 1);
        await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
        await page.getByRole('button', { name: 'Cài UniNet', exact: true }).waitFor({ state: 'hidden' });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await context.setOffline(true);
        await page.goto(origin + '/profile?offline-check=1');
        await page.getByRole('heading', { name: 'Chưa có kết nối mạng' }).waitFor();
        await page.getByRole('link', { name: 'Thử kết nối lại' }).waitFor();
        await context.setOffline(false);
        const cacheEntries = await page.evaluate(async () => {
          const names = await caches.keys();
          const result = [];
          for (const name of names.filter(name => name.startsWith('uninet-pwa-offline-'))) {
            const cache = await caches.open(name);
            result.push(...(await cache.keys()).map(request => new URL(request.url).pathname));
          }
          return result;
        });
        assert.deepEqual(cacheEntries, ['/offline.html']);
        assert.deepEqual(errors, []);
        console.log(`PASS ${width}px manifest, worker, install states, offline privacy`);
      } finally { await context.close(); }
    }
    const ios = await browser.newContext({ viewport: { width: 390, height: 900 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1', reducedMotion: 'reduce' });
    try {
      const page = await ios.newPage();
      await page.goto(origin + '/');
      await page.getByRole('button', { name: 'Cài UniNet', exact: true }).click();
      await page.getByRole('dialog', { name: 'Cài UniNet trên thiết bị' }).waitFor();
      await page.getByText(/Thêm vào Màn hình chính/).waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      console.log('PASS iOS installation guidance and Escape dismissal');
    } finally { await ios.close(); }
    const standalone = await browser.newContext({ viewport: { width: 390, height: 900 } });
    try {
      await standalone.addInitScript(() => {
        const matchMedia = window.matchMedia.bind(window);
        window.matchMedia = query => { const media = matchMedia(query); if (query === '(display-mode: standalone)') Object.defineProperty(media, 'matches', { value: true }); return media; };
      });
      const page = await standalone.newPage(); await page.goto(origin + '/');
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Cài UniNet', exact: true }).count(), 0);
      console.log('PASS standalone install action hidden');
    } finally { await standalone.close(); }
    const signedIn = await browser.newContext({ viewport: { width: 390, height: 900 } });
    try {
      const account = { id: 'pwa-student', email: 'pwa-student@test.local', role: 0, profileComplete: true,
        profile: { id: 'pwa-profile', fullName: 'PWA Student', displayName: 'PWA Student', nickname: 'Student', isVerified: false, universityName: 'UIT' } };
      const page = await signedIn.newPage();
      await page.route('https://accounts.google.com/gsi/client*', route => route.fulfill({ contentType: 'text/javascript', body: 'window.google={accounts:{id:{initialize(){},renderButton(){}}}};' }));
      await page.route('**/api/**', route => {
        const pathname = new URL(route.request().url()).pathname;
        if (pathname.endsWith('/auth/login')) return route.fulfill({ json: { account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false } });
        if (pathname.endsWith('/auth/me')) return route.fulfill({ json: account });
        if (pathname.endsWith('/profile/portfolio/me')) return route.fulfill({ json: { isOwner: true, profile: account.profile, portfolio: {} } });
        return route.fulfill({ json: { data: [], items: [], total: 0, unreadCount: 0 } });
      });
      await page.goto(origin + '/login?paymentReturn=resume');
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
      await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('Fixture123!');
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await page.waitForURL('**/payment/result');
      await page.goto(origin + '/settings');
      await page.getByRole('button', { name: 'Cài UniNet', exact: true }).waitFor();
      const installationAction = page.getByRole('button', { name: 'Cài UniNet', exact: true });
      await installationAction.scrollIntoViewIfNeeded();
      assert.equal(await installationAction.evaluate(element => {
        const policy = [...document.querySelectorAll('[role="button"]')].find(node => node.getAttribute('aria-label')?.startsWith('Chính sách bảo mật') || node.textContent.includes('Chính sách bảo mật'));
        return !!policy && !!(policy.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) && getComputedStyle(element).borderTopStyle === 'solid';
      }), true, 'Settings install action must be an outlined button below the policy rows');
      await page.screenshot({ path: '.expo/pwa-artifacts/settings-install-button.png', fullPage: true, animations: 'disabled', timeout: 5000 });
      await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
      await page.getByRole('button', { name: 'Cài UniNet', exact: true }).waitFor({ state: 'hidden' });
      console.log('PASS authenticated Settings installation action');
    } finally { await signedIn.close(); }
    const persistent = await chromium.launchPersistentContext(path.resolve('.expo/pwa-eligibility-profile'), {
      executablePath: process.env.CHROME_PATH || path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'), headless: true,
    });
    try {
      const page = persistent.pages()[0]; await page.goto(origin + '/');
      await page.getByRole('button', { name: 'Cài UniNet', exact: true }).waitFor();
      await page.evaluate(async () => { await navigator.serviceWorker.ready; });
      const cdp = await persistent.newCDPSession(page);
      const eligibility = await cdp.send('Page.getInstallabilityErrors');
      assert.deepEqual(eligibility.installabilityErrors, []);
      await cdp.detach();
      console.log('PASS Chrome installability in a non-incognito profile');
    } finally { await persistent.close(); }
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error.message); server.close(); process.exitCode = 1; });
