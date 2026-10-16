// Isolated browser regression: no real Gemini calls, uploads or profile writes.
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';
const photoBytes = fs.readFileSync(process.env.PORTRAIT_TEST_SOURCE || 'assets/images/profile-samples/developer-portrait.png');
const previewBytes = process.env.PORTRAIT_TEST_PREVIEW ? fs.readFileSync(process.env.PORTRAIT_TEST_PREVIEW) : photoBytes;
const imageUrl = 'https://res.cloudinary.com/fixture/image/upload/v1/uninet/portfolio/portraits/11111111111111111111111111111111.png';
const account = { id: 'portrait-test', email: 'portrait@example.org', role: 0, profileComplete: true, profile: { id: 'portrait-profile', fullName: 'Nguyễn An', displayName: 'An', isVerified: false } };
const data = { profile: { ...account.profile, avatarUrl: null, coverUrl: null }, isOwner: true, skillCatalog: [], portfolio: { appearance: { profile: { template: 'developer-landscape', theme: 'pink', font: 'Inter', sectionOrder: [], hiddenSections: [] } }, skills: [], projects: [], education: [], experience: [], certificates: [], activities: [], languages: [], articles: [], socialLinks: [] } };

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let pending = [], processes = 0, confirms = 0, writes = 0, releases = 0;
  const replyPreview = route => route.fulfill({ json: { success: true, data: { sessionId: 'portrait-session', previewUrl: `data:image/png;base64,${previewBytes.toString('base64')}`, hasTransparentBackground: true, expiresAt: '2099-01-01T00:00:00Z' } } });
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
    if (url.pathname.endsWith('/ai-images/remove-background')) {
      processes++; assert.match(request.headers()['content-type'], /^multipart\/form-data; boundary=/);
      return new Promise(resolve => pending.push({ route, resolve }));
    }
    if (url.pathname.endsWith('/ai-images/confirm')) { confirms++; return route.fulfill({ json: { success: true, data: { imageUrl, hasTransparentBackground: true } } }); }
    if (url.pathname.includes('/ai-images/sessions/')) { releases++; return route.fulfill({ status: 204 }); }
    if (request.url() === imageUrl) return route.fulfill({ contentType: 'image/png', body: photoBytes });
    if (url.pathname.endsWith('/auth/login')) return route.fulfill({ json: { account, accessToken: 'isolated-test-access', refreshToken: 'isolated-test-refresh', requiresProfileCompletion: false } });
    if (url.pathname.endsWith('/auth/me') || url.pathname.endsWith('/profile/me')) return route.fulfill({ json: account });
    if (url.pathname.endsWith('/profile/portfolio/editor/me')) { writes++; return route.fulfill({ json: data }); }
    if (url.pathname.endsWith('/profile/portfolio/me')) return route.fulfill({ json: data });
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: [] });
    return route.continue();
  });
  const respond = async error => {
    await page.waitForFunction(() => !!document.querySelector('[data-testid="portrait-processing"]'));
    const item = pending.shift(); assert.ok(item);
    try { await (error ? item.route.fulfill({ status: 503, json: { code: 'PORTRAIT_PROVIDER_BUSY', message: 'Dịch vụ tách nền đang tạm thời quá tải. Vui lòng thử lại sau ít phút. Ảnh của bạn chưa được lưu vào hồ sơ.' } }) : replyPreview(item.route)); }
    finally { item.resolve(); }
  };
  const choose = async (expectMotion = true) => {
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Đổi ảnh đại diện', exact: true }).click();
    await (await chooser).setFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: photoBytes });
    await page.getByTestId('portrait-processing').waitFor();
    if (expectMotion) await page.waitForFunction(() => document.querySelector('[data-testid="portrait-scan"]'));
  };
  fs.mkdirSync('dist/portrait-processing', { recursive: true });
  try {
    await page.goto(`${origin}/profile/editor?template=developer-landscape&theme=pink`);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.reload();
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('isolated-test-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click();
    await page.getByRole('button', { name: 'Mẫu hồ sơ', exact: true }).click();
    await page.getByRole('button', { name: 'Xem Developer Landscape màu Pink Sunset', exact: true }).click();
    await page.getByRole('button', { name: 'Chọn mẫu này', exact: true }).click();
    await choose();
    const scan = page.getByTestId('portrait-scan');
    await page.waitForFunction(() => document.querySelector('[data-testid="portrait-scan"]')?.getAttribute('style')?.includes('transform'));
    const before = await scan.getAttribute('style');
    await page.waitForFunction(previous => document.querySelector('[data-testid="portrait-scan"]')?.getAttribute('style') !== previous, before);
    assert.equal(await page.getByRole('button', { name: 'Xác nhận', exact: true }).isDisabled(), true);
    assert.equal(confirms, 0); assert.equal(writes, 0);
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 850 });
      const dialog = await page.getByTestId('portrait-processing').boundingBox();
      assert.ok(dialog.width <= width && dialog.x >= 0);
      await page.screenshot({ path: `dist/portrait-processing/loading-${width}.png` });
    }
    await page.getByText('Ảnh vẫn đang được xử lý', { exact: true }).waitFor({ timeout: 25000 });
    await respond(true);
    await page.getByText('Dịch vụ tách nền đang tạm thời quá tải. Vui lòng thử lại sau ít phút. Ảnh của bạn chưa được lưu vào hồ sơ.', { exact: true }).waitFor();
    assert.equal(await page.getByTestId('portrait-processing').count(), 0);
    await page.getByRole('button', { name: 'Thử tách nền lại', exact: true }).click();
    await page.getByTestId('portrait-processing').waitFor();
    await respond(false);
    await page.getByText('Ảnh đã tách nền', { exact: true }).waitFor();
    assert.equal(await page.getByTestId('portrait-scan').count(), 0);
    await page.screenshot({ path: 'dist/portrait-processing/ready.png' });
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await page.getByRole('heading', { name: 'Ảnh chân dung', exact: true }).waitFor({ state: 'hidden' });
    assert.equal(confirms, 1); assert.equal(writes, 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await choose(false);
    await page.waitForFunction(() => !document.querySelector('[data-testid="portrait-scan"]'));
    await page.screenshot({ path: 'dist/portrait-processing/reduced-motion.png' });
    await respond(false);
    await page.getByText('Ảnh đã tách nền', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('[data-testid="portrait-processing"]'));
    await choose(false);
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    await page.getByRole('heading', { name: 'Ảnh chân dung', exact: true }).waitFor({ state: 'hidden' });
    // Finishing a request after the dialog closes must not resurrect the preview.
    const cancelled = pending.shift(); assert.ok(cancelled);
    try { await replyPreview(cancelled.route).catch(() => {}); } finally { cancelled.resolve(); }
    assert.equal(await page.getByTestId('portrait-scan').count(), 0);
    assert.equal(confirms, 1);
    assert.equal(writes, 0); assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'loading animation, responsive, long wait, failure/retry, preview, draft, reduced motion and cancel passed', processes, confirms, writes, releases }));
  } catch (error) {
    await page.screenshot({ path: 'dist/portrait-processing/failure.png' }).catch(() => {});
    throw error;
  } finally {
    for (const item of pending) { await item.route.abort().catch(() => {}); item.resolve(); }
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
