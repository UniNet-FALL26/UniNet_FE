// Compare the same fixture in preview/editor; use only synthetic authentication and mocked API.
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8082';
const account = { id: 'hero-parity-owner', email: 'hero@example.org', role: 0, profileComplete: true, profile: sample.profile };
let owner = { ...structuredClone(sample), isOwner: true };
const templates = { 'developer-modern': 'Developer Modern', 'developer-landscape': 'Developer Landscape', 'developer-showcase': 'Developer Showcase' };

async function textGeometry(page, data) {
  const name = page.getByRole('heading', { name: data.profile.fullName, exact: true });
  return name.evaluate((heading, texts) => {
    const hero = heading.closest('[data-testid$="-hero"]') || heading.parentElement.parentElement.parentElement.parentElement;
    const heroBox = hero.getBoundingClientRect();
    return texts.map(text => {
      const node = [...hero.querySelectorAll('div,h1')].find(element => element.textContent === text && element.children.length === 0)
        || [...hero.querySelectorAll('h1')].find(element => element.textContent === text);
      if (!node) throw new Error(`Missing hero text: ${text}`);
      const range = document.createRange(); range.selectNodeContents(node); const rect = range.getBoundingClientRect(); const style = getComputedStyle(node);
      return { x: rect.x - heroBox.x, y: rect.y - heroBox.y, width: rect.width, height: rect.height, fontSize: style.fontSize, lineHeight: style.lineHeight, fontWeight: style.fontWeight, color: style.color };
    });
  }, [data.profile.fullName, data.profile.nickname, data.portfolio.headline, data.profile.bio].map((value, index) => index === 1 && page.url().includes('developer-landscape') ? value : index === 1 ? '@' + value : value));
}

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
    if (pathname.endsWith('/auth/login')) return route.fulfill({ json: { account, accessToken: 'hero-test-access', refreshToken: 'hero-test-refresh', requiresProfileCompletion: false } });
    if (pathname.endsWith('/auth/me')) return route.fulfill({ json: account });
    if (pathname.endsWith('/profile/portfolio/me')) return route.fulfill({ json: owner });
    if (pathname.startsWith('/api/')) return route.fulfill({ json: [] });
    return route.continue();
  });
  fs.mkdirSync('dist/profile-verification', { recursive: true });
  try {
    await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => {
      const inputs = [...document.querySelectorAll('input')];
      return inputs.length >= 2 && inputs.every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function'));
    });
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('hero-test-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click();
    await page.getByRole('button', { name: 'Mẫu hồ sơ', exact: true }).click();
    for (const [template, title] of Object.entries(templates)) for (const width of [320,768,1440]) {
      owner = { ...structuredClone(sample), isOwner: true };
      await page.setViewportSize({ width, height: 1000 });
      await page.getByRole('button', { name: `Xem trước ${title}`, exact: true }).click();
      await page.getByRole('button', { name: 'Chọn mẫu này', exact: true }).waitFor();
      const preview = await textGeometry(page, sample);
      await page.screenshot({ path: `dist/profile-verification/hero-parity-preview-${template}-${width}.png` });
      await page.getByRole('button', { name: 'Chọn mẫu này', exact: true }).click();
      await page.getByRole('button', { name: 'Chỉnh sửa họ và tên', exact: true }).waitFor();
      const editor = await textGeometry(page, owner);
      await page.screenshot({ path: `dist/profile-verification/hero-parity-editor-${template}-${width}.png` });
      preview.forEach((expected, index) => {
        for (const key of ['x','y','width','height']) assert.ok(Math.abs(editor[index][key] - expected[key]) <= 1, `${template}/${width} field ${index} ${key}: preview=${expected[key]}, editor=${editor[index][key]}`);
        for (const key of ['fontSize','lineHeight','fontWeight','color']) assert.equal(editor[index][key], expected[key], `${template}/${width} ${key}`);
      });
      for (const label of ['Chỉnh sửa họ và tên', 'Chỉnh sửa biệt danh', 'Chỉnh sửa chức danh', 'Chỉnh sửa giới thiệu']) {
        const gap = await page.getByRole('button', {name: label, exact:true}).evaluate(button => {
          const range=document.createRange(); range.selectNodeContents(button.firstElementChild);
          return button.lastElementChild.getBoundingClientRect().left-Array.from(range.getClientRects()).at(-1).right;
        });
        assert.ok(gap >= 0 && gap <= 8, `${template}/${width} pencil gap ${gap}`);
      }
      assert.equal(await page.getByRole('button', {name:'Đổi ảnh bìa', exact:true}).count(), 0);
      assert.equal(await page.getByRole('button', {name:'Đổi ảnh đại diện', exact:true}).count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.getByRole('button', { name: 'Chỉnh sửa giới thiệu', exact: true }).locator(':scope > div').last().click();
      assert.equal(await page.getByRole('textbox', { name: 'Giới thiệu', exact: true }).inputValue(), sample.profile.bio);
      await page.getByRole('button', { name: 'Hủy', exact: true }).click();
      await page.getByRole('button', { name: 'Quay lại xem mẫu', exact: true }).click();
      await page.getByRole('button', { name: 'Quay lại mẫu hồ sơ', exact: true }).click();
    }
    assert.deepEqual(errors, []);
    console.log('Preview/editor introduction geometry and typography match for all three templates at 320/768/1440px; pencil forms remain functional.');
  } catch (error) {
    console.error('Original check failure:', error.message);
    await page.screenshot({ path: 'dist/profile-verification/hero-parity-failure.png', timeout: 5000 }).catch(() => {});
    console.error('Failure page:', page.url(), (await page.locator('body').innerText()).slice(0,800));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
