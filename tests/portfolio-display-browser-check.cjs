// Browser state/UX coverage with isolated API fixtures; HTTP persistence is tested in PortfolioHttpTests.cs.
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sample = require('../src/data/profile-sample.json');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8083';
const profileId = '11111111-1111-1111-1111-111111111111';
const account = { id: 'display-student', email: 'display@example.org', role: 0, profileComplete: true, profile: { id: profileId, fullName: 'Nguyễn Mai An', nickname: 'Mai An', displayName: 'Mai An', isVerified: false } };
let saved = { ...structuredClone(sample), isOwner: true, profile: { ...sample.profile, ...account.profile, avatarUrl: null, coverUrl: null, bio: 'Giới thiệu của An' } };
saved.portfolio.appearance.profile = { template: 'developer-modern', theme: 'blue', font: 'Inter', sectionOrder: [], hiddenSections: [], showPortfolio: true };
saved.portfolio.isPublic = true;
let failSave = false, failDisplay = false, failLoad = false, saveGate = null, finishSave, writes = 0;
const paths = [];
function visitorResponse() {
  const result = structuredClone(saved); result.isOwner = false; result.skillCatalog = null;
  if (result.portfolio.appearance.profile.showPortfolio === false) {
    result.profile.bio = null;
    for (const key of ['skills', 'projects', 'education', 'experience', 'certificates', 'articles', 'socialLinks', 'activities', 'languages']) result.portfolio[key] = [];
    for (const key of ['headline', 'careerObjective', 'contactEmail', 'cvUrl', 'location', 'availability', 'gpa', 'yearsOfExperience']) result.portfolio[key] = null;
  }
  return result;
}

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const errors = [];
  const context = await browser.newContext();
  context.setDefaultTimeout(15000);
  await context.route('**/*', async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (path.startsWith('/api/')) paths.push(path);
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
    if (path.endsWith('/auth/login') || path.endsWith('/auth/refresh')) return route.fulfill({ json: { account, accessToken: 'display-test-access', refreshToken: 'display-test-refresh', requiresProfileCompletion: false } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: account });
    if (path.endsWith('/profile/portfolio/me')) return failLoad ? route.fulfill({ status: 500, json: { message: 'Lỗi tải kiểm thử' } }) : route.fulfill({ json: saved });
    if (path.endsWith('/profile/portfolio/editor/me')) {
      writes++;
      if (saveGate) await saveGate;
      if (failSave) return route.fulfill({ status: 500, json: { message: 'Lỗi lưu kiểm thử' } });
      const payload = req.postDataJSON(), display = saved.portfolio.appearance.profile.showPortfolio;
      saved = { ...saved, profile: { ...saved.profile, ...payload.profile }, portfolio: payload.portfolio };
      saved.portfolio.appearance.profile.showPortfolio = display;
      return route.fulfill({ json: saved });
    }
    if (path.endsWith('/profile/portfolio/display/me')) {
      writes++;
      if (failDisplay) return route.fulfill({ status: 500, json: { message: 'Lỗi cài đặt kiểm thử' } });
      saved.portfolio.appearance.profile.showPortfolio = req.postDataJSON().showPortfolio;
      return route.fulfill({ json: saved });
    }
    if (path.endsWith(`/profile/portfolio/${profileId}`)) return saved.portfolio.isPublic ? route.fulfill({ json: visitorResponse() }) : route.fulfill({ status: 404, json: { message: 'Không tìm thấy hồ sơ công khai.' } });
    if (path.startsWith('/api/')) return route.fulfill({ json: [] });
    return route.continue();
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  const button = name => page.getByRole('button', { name, exact: true }).filter({ visible: true });
  const save = () => button('Lưu hồ sơ');
  const signIn = async (targetPage = page) => {
    await targetPage.goto(`${origin}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await targetPage.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await targetPage.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await targetPage.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('display-test-password');
    await targetPage.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await targetPage.waitForURL(url => !url.pathname.includes('/login'));
  };
  const chooseFromGallery = async (name, color) => {
    await button(`Xem ${name} màu ${color}`).click();
    await button('Chọn mẫu này').click(); await save().waitFor();
  };
  const goGallery = async () => {
    await button('Chọn mẫu khác').click();
    const discard = button('Bỏ thay đổi và chọn mẫu khác'); if (await discard.isVisible()) await discard.click();
    await page.getByRole('heading', { name: 'Mẫu hồ sơ', exact: true }).waitFor();
  };
  const commit = async (template, theme) => {
    assert.equal(await save().isDisabled(), false);
    await save().click(); await page.getByText('Đã lưu hồ sơ.', { exact: true }).filter({ visible: true }).first().waitFor();
    assert.equal(saved.portfolio.appearance.profile.template, template); assert.equal(saved.portfolio.appearance.profile.theme, theme);
    assert.equal(await save().isDisabled(), true);
  };
  fs.mkdirSync('dist/portfolio-display-verification', { recursive: true });
  try {
    await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('display-test-password');
    await button('Đăng nhập').click(); await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click(); await button('Chỉnh sửa hồ sơ').click();
    assert.equal(await save().isDisabled(), true);
    await button('Chọn màu Vàng cam').click(); assert.equal(await save().isDisabled(), false);
    assert.equal(await button('Chọn màu Vàng cam').getAttribute('aria-pressed'), 'true');
    await button('Chọn màu Xanh công nghệ').click(); assert.equal(await save().isDisabled(), true);
    await button('Chọn màu Vàng cam').click(); await commit('developer-modern', 'amber');
    await button('Quay lại xem mẫu').click(); await button('Chỉnh sửa hồ sơ').click();
    assert.equal(await button('Chọn màu Vàng cam').getAttribute('aria-pressed'), 'true');
    await goGallery(); await chooseFromGallery('Developer Showcase', 'Mint');
    assert.equal(await save().isDisabled(), false); assert.equal(writes, 1, 'Selection never auto-saves');
    await button('Chọn mẫu khác').click(); await button('Tiếp tục chỉnh sửa').click();
    assert.equal(await save().isDisabled(), false);
    await goGallery(); await button('Quay lại trang cá nhân').click();
    assert.equal(await save().isDisabled(), true, 'Returning from gallery cannot resurrect discarded draft');
    assert.equal(await button('Chọn màu Vàng cam').getAttribute('aria-pressed'), 'true');
    await goGallery(); await chooseFromGallery('Developer Showcase', 'Mint'); await commit('developer-showcase', 'mint');
    await goGallery(); await chooseFromGallery('Developer Landscape', 'Pink Sunset');
    const previousProjects = structuredClone(saved.portfolio.projects), previousActivities = structuredClone(saved.portfolio.activities);
    await button('Chỉnh sửa chức danh').click(); await page.getByRole('textbox', { name: 'Chức danh', exact: true }).fill('Chức danh mới'); await button('Xác nhận').click();
    failSave = true; await save().click(); await page.getByText('Lỗi lưu kiểm thử', { exact: true }).waitFor();
    assert.equal(await save().isDisabled(), false); assert.equal(saved.portfolio.appearance.profile.template, 'developer-showcase');
    failSave = false; saveGate = new Promise(resolve => { finishSave = resolve; });
    await save().click(); assert.equal(await button('Chọn mẫu khác').isDisabled(), true); assert.equal(await button('Quay lại xem mẫu').isDisabled(), true); assert.equal(await button('Chọn màu Blue Mountain').isDisabled(), true);
    finishSave(); await page.getByText('Đã lưu hồ sơ.', { exact: true }).filter({ visible: true }).first().waitFor(); saveGate = null;
    assert.equal(saved.portfolio.appearance.profile.template, 'developer-landscape'); assert.equal(saved.portfolio.appearance.profile.theme, 'pink'); assert.equal(saved.portfolio.headline, 'Chức danh mới');
    assert.deepEqual(saved.portfolio.projects, previousProjects); assert.deepEqual(saved.portfolio.activities, previousActivities);
    await page.reload({ waitUntil: 'commit' }); await signIn(); await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click(); await button('Chỉnh sửa hồ sơ').click(); await save().waitFor();
    // Reload route retains the selection; server content is now the clean baseline.
    assert.equal(await save().isDisabled(), true);
    await button('Chọn màu Mint Forest').click(); assert.equal(await save().isDisabled(), false);
    await button('Chọn màu Pink Sunset').click(); assert.equal(await save().isDisabled(), true);
    for (const width of [320,768,1024,1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `dist/portfolio-display-verification/editor-${width}.png` });
    }
    await signIn(); await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click(); await button('Mở cài đặt').click();
    const toggle = page.getByRole('switch', { name: 'Hiển thị mẫu hồ sơ', exact: true }); await toggle.waitFor();
    failDisplay = true; await toggle.click(); await page.getByText('Lỗi cài đặt kiểm thử', { exact: true }).waitFor();
    assert.equal(saved.portfolio.appearance.profile.showPortfolio, true);
    failDisplay = false; await button('Thử lưu lại').click(); await page.getByText('Đã cập nhật cách hiển thị hồ sơ.', { exact: true }).waitFor();
    assert.equal(saved.portfolio.appearance.profile.showPortfolio, false);
    await button('Quay lại hồ sơ cá nhân').click(); await page.getByTestId('student-profile-starter').waitFor();
    assert.equal(await button('Chỉnh sửa hồ sơ').count(), 1, 'Disabled portfolio remains editable');
    assert.deepEqual(saved.portfolio.projects, previousProjects);
    await button('Mở cài đặt').click(); await toggle.waitFor(); await toggle.click(); await page.getByText('Đã cập nhật cách hiển thị hồ sơ.', { exact: true }).waitFor();
    await button('Quay lại hồ sơ cá nhân').click(); await page.getByTestId('landscape-hero').waitFor();
    assert.equal(saved.portfolio.appearance.profile.theme, 'pink');
    const anotherDevice = await context.newPage(); await signIn(anotherDevice); await anotherDevice.getByRole('tab', { name: 'Cá nhân', exact: true }).click(); await anotherDevice.getByTestId('landscape-hero').waitFor(); await anotherDevice.close();
    console.log('PASS: editor and display off/on checks');
    await page.goto(`${origin}/profile/view/${profileId}`, { waitUntil: 'domcontentloaded' }); await page.getByTestId('landscape-hero').waitFor();
    for (const label of ['Chỉnh sửa hồ sơ','Chọn mẫu khác','Đổi ảnh đại diện','Đổi ảnh bìa','Thêm dự án','Thêm học vấn']) assert.equal(await button(label).count(), 0);
    assert.ok(paths.includes(`/api/profile/portfolio/${profileId}`));
    saved.portfolio.appearance.profile.showPortfolio = false; await page.reload({ waitUntil: 'commit' }); await page.getByTestId('student-profile-starter').waitFor();
    for (const label of ['Đổi ảnh đại diện','Đổi ảnh bìa','Chọn mẫu hồ sơ']) assert.equal(await button(label).count(), 0);
    saved.portfolio.isPublic = false; await page.reload({ waitUntil: 'commit' }); await page.getByText('Không tìm thấy hồ sơ công khai.', { exact: true }).waitFor();
    assert.equal(await page.getByTestId('student-profile-starter').count(), 0);
    await page.waitForFunction(() => [...document.querySelectorAll('[role="button"]')].some(element => element.textContent === 'Thử lại' && Object.keys(element).some(key => key.startsWith('__reactProps') && typeof element[key]?.onClick === 'function')));
    saved.portfolio.isPublic = true; await button('Thử lại').click(); await page.getByTestId('student-profile-starter').waitFor();
    console.log('PASS: visitor read-only, private denial and retry');
    await signIn(); await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click(); await button('Mở cài đặt').click(); await toggle.waitFor();
    for (const width of [320,768,1440]) { await page.setViewportSize({ width, height: 900 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); await page.screenshot({ path: `dist/portfolio-display-verification/settings-${width}.png` }); }
    console.log('PASS: responsive settings');
    failLoad = true; await page.reload({ waitUntil: 'commit' }); await signIn(); await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click(); await button('Mở cài đặt').click(); await page.getByText('Lỗi tải kiểm thử', { exact: true }).filter({ visible: true }).waitFor(); failLoad = false; await button('Thử lại').click(); await toggle.waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: appearance-only saves, palette revert, template changes, discard/cancel, content retention, save failure and lock, reload, display off/on and retry, second page server reads, read-only visitor/private denial, responsive editor/settings, no page errors.');
  } catch (error) { await page.screenshot({ path: 'dist/portfolio-display-verification/failure.png' }).catch(() => {}); console.error('Failure route:', page.url()); throw error; }
  finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
