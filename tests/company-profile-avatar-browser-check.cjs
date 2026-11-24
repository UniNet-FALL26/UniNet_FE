const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8083';
const profile = { id: 'partner-profile', fullName: 'Company Test', organizationName: 'Company Test', partnerType: 0, avatarUrl: `${origin}/avatar-fixture.png`, coverUrl: null, bio: '', websites: [], isVerified: true };
const account = { id: 'partner-account', email: 'partner@example.test', role: 1, status: 1, profileComplete: true, profile };

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('uninet.session.v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: '2099-01-01T00:00:00Z' })));
    await page.routeWebSocket('**/hubs/notifications**', socket => socket.onMessage(value => { if (String(value).includes('"protocol"')) socket.send('{}\x1e'); }));
    await page.route('**/avatar-fixture.png', route => route.fulfill({ contentType: 'image/png', body: fs.readFileSync('assets/images/uninet-mark.png') }));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
      const json = path.endsWith('/auth/me') || path.endsWith('/profile/me') ? account
        : path.endsWith('/partner/dashboard') ? { organizationName: profile.organizationName, openJobs: [] }
        : path.endsWith('/partner/verification/me') ? { status: 1, documents: [] }
        : path.endsWith('/unread-count') ? { count: 0 } : { items: [], totalItems: 0 };
      return route.fulfill({ json });
    });
    fs.mkdirSync('dist/company-profile-avatar', { recursive: true });
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${origin}/(company)/profile`);
      await page.getByTestId('company-profile-hero').waitFor().catch(async error => {
        console.log('Page:', page.url(), (await page.locator('body').innerText()).slice(0, 800));
        console.log('Runtime errors:', errors);
        throw error;
      });
      const avatar = page.getByTestId('company-profile-avatar').getByRole('img', { name: 'Ảnh đại diện đối tác', exact: true });
      await avatar.waitFor({ state: 'visible' });
      await page.waitForFunction(() => {
        const image = document.querySelector('[data-testid="company-profile-avatar"] img');
        return image?.complete && image.naturalWidth > 0 && image.getBoundingClientRect().width > 0;
      });
      const bounds = await avatar.boundingBox();
      assert.ok(bounds.width > 0 && bounds.height > 0);
      await page.screenshot({ path: `dist/company-profile-avatar/${width}.png` });
      console.log(`${width}px: company avatar loaded and visible`);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
