// Isolated UI verification. All API calls are mocked; no real profile data is written.
const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8082';
const account = { id: 'editor-test-owner', email: 'editor@example.org', role: 0, profileComplete: true, profile: { id: 'editor-profile', fullName: 'Nguyễn An', nickname: 'An', displayName: 'An', organizationName: null, isVerified: false } };
let real = {
  profile: { ...account.profile, avatarUrl: null, coverUrl: null, bio: null, universityName: null, major: null }, isOwner: true,
  skillCatalog: [{ id: '11111111-1111-1111-1111-111111111111', name: 'React', category: 'Frontend', iconUrl: null }],
  portfolio: { headline: null, careerObjective: null, location: null, availability: null, contactEmail: null, cvUrl: null, isPublic: false, appearance: { profile: { template: 'developer-modern', theme: 'blue', font: 'Inter', sectionOrder: [], hiddenSections: ['skills', 'languages'] } }, skills: [], projects: [], education: [], experience: [], certificates: [], activities: [{ title: 'Existing activity' }], languages: [{ name: 'Existing language', level: 'Native' }], articles: [], socialLinks: [] },
};
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let gets = 0, writes = 0, failLoad = false, failSave = false;
  await page.route('**/*', async route => {
    const req = route.request(); const url = new URL(req.url()); const reply = body => route.fulfill({ json: body });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
    if (url.pathname === '/editor-avatar.svg') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="240"><rect width="200" height="240" fill="#2563eb"/></svg>' });
    if (url.pathname.endsWith('/auth/login')) return reply({ account, accessToken: 'isolated-test-access', refreshToken: 'isolated-test-refresh', requiresProfileCompletion: false });
    if (url.pathname.endsWith('/auth/me') || url.pathname.endsWith('/profile/me')) return reply(account);
    if (url.pathname.endsWith('/profile/portfolio/editor/me')) {
      writes++; if (failSave) return route.fulfill({ status: 500, json: { message: 'Lỗi lưu kiểm thử' } });
      const body = req.postDataJSON(); assert.equal(body.profile.isVerified, undefined); assert.equal(body.profile.id, undefined);
      real = { ...real, profile: { ...real.profile, ...body.profile }, portfolio: body.portfolio }; return reply(real);
    }
    if (url.pathname.endsWith('/profile/portfolio/me')) { gets++; if (failLoad) return route.fulfill({ status: 500, json: { message: 'Lỗi tải kiểm thử' } }); return reply(real); }
    if (url.pathname.startsWith('/api/')) return reply([]);
    return route.continue();
  });
  fs.mkdirSync('dist/profile-verification', { recursive: true });
  try {
    await page.goto(`${origin}/profile/editor?template=developer-landscape&theme=pink`);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).waitFor(); assert.equal(gets, 0);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.reload();
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('editor@example.org');
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('isolated-test-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click(); await page.getByRole('button', { name: 'Mẫu hồ sơ', exact: true }).click();
    const templates = { 'developer-modern': 'Developer Modern', 'developer-showcase': 'Developer Showcase', 'developer-landscape': 'Developer Landscape' };
    for (const name of Object.values(templates)) {
      await page.getByRole('button', { name: `Xem trước ${name}`, exact: true }).click(); await page.getByRole('button', { name: 'Chọn mẫu này', exact: true }).waitFor();
      assert.equal(gets, 0); assert.equal(await page.getByRole('button', { name: 'Chỉnh sửa họ và tên', exact: true }).count(), 0);
      assert.ok(await page.getByRole('heading', { name: 'Trịnh Trọng Quyền', exact: true }).count() > 0);
      await page.getByRole('button', { name: 'Quay lại mẫu hồ sơ', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Xem Developer Landscape màu Pink Sunset', exact: true }).click();
    await page.getByRole('button', { name: 'Chọn mẫu này', exact: true }).click(); await page.getByRole('button', { name: 'Thêm dự án', exact: true }).waitFor();
    assert.ok(page.url().includes('template=developer-landscape') && page.url().includes('theme=pink'));
    assert.equal(await page.getByRole('heading', { name: 'Thông tin hồ sơ', exact: true }).count(), 0);
    for (const title of ['Giới thiệu & liên hệ', 'Học vấn', 'Kinh nghiệm', 'Hoạt động', 'Ngôn ngữ']) assert.equal(await page.getByRole('heading', { name: title, exact: true }).count(), 0, 'No foreign sections appended to landscape');
    for (const title of ['Kỹ năng', 'Hành trình phát triển', 'Chứng chỉ', 'Blog & Chia sẻ', 'Dự án bản thân']) assert.equal(await page.getByRole('heading', { name: title, exact: true }).count(), 1, `Native heading ${title}`);
    assert.equal(await page.locator('[data-testid="landscape-contact"]:visible').count(), 1); assert.equal(await page.locator('[data-testid="landscape-footer"]:visible').count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).isDisabled(), true);
    const add = async (name, fields) => {
      await page.getByRole('button', { name, exact: true }).click();
      for (const [label, value] of Object.entries(fields)) await page.getByRole('textbox', { name: label, exact: true }).fill(value);
      await page.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await page.getByRole('button', { name: 'Đóng biểu mẫu', exact: true }).waitFor({ state: 'hidden' });
    };
    const edit = async (name, label, value) => {
      await page.getByRole('button', { name, exact: true }).first().click(); await page.getByRole('textbox', { name: label, exact: true }).fill(value);
      await page.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await page.getByRole('textbox', { name: label, exact: true }).waitFor({ state: 'hidden' });
    };
    await page.getByRole('button', { name: 'Thêm dự án', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận', exact: true }).click(); await page.getByRole('alert').waitFor(); await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    await add('Thêm dự án', { 'Tên / tiêu đề *': 'Dự án thật của An', 'Công nghệ (phân cách bằng dấu phẩy)': 'React, TypeScript' });
    assert.equal(await page.locator('[data-testid="landscape-project"]:visible').getByRole('heading', { name: 'Dự án thật của An', exact: true }).count(), 1);
    assert.ok((await page.locator('[data-testid="landscape-stats"]:visible').innerText()).includes('1\nDự án đã xây dựng'));
    await page.getByRole('button', { name: 'Thêm kỹ năng', exact: true }).click(); await page.getByRole('button', { name: 'React', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await page.getByRole('button', { name: 'Đóng biểu mẫu', exact: true }).waitFor({ state: 'hidden' });
    assert.ok((await page.locator('[data-testid="landscape-stats"]:visible').innerText()).includes('1\nCông nghệ sử dụng'));
    await add('Thêm học vấn', { 'Tên / tiêu đề *': 'Kỹ thuật phần mềm của An' });
    await add('Thêm kinh nghiệm', { 'Tên / tiêu đề *': 'Công việc của An' });
    assert.equal(await page.locator('[data-testid="landscape-journey"]:visible').getByRole('heading', { level: 3 }).count(), 2);
    await add('Thêm chứng chỉ', { 'Tên / tiêu đề *': 'Chứng chỉ của An', 'Đơn vị cấp *': 'Đơn vị cấp' });
    await add('Thêm bài viết', { 'Tên / tiêu đề *': 'Bài viết của An', 'Liên kết *': 'https://portfolio.example.org/article' });
    await add('Thêm liên kết cá nhân', { 'Tên liên kết *': 'Website của An', 'Liên kết *': 'https://portfolio.example.org' });
    await edit('Chỉnh sửa họ và tên', 'Họ và tên', 'Nguyễn An Mới');
    await edit('Chỉnh sửa biệt danh', 'Biệt danh', 'An Mới');
    await edit('Chỉnh sửa chức danh', 'Chức danh', 'Lập trình viên của An');
    await edit('Chỉnh sửa giới thiệu', 'Giới thiệu', 'Giới thiệu thật của An');
    await edit('Chỉnh sửa email liên hệ', 'Email liên hệ', 'an@example.org');
    await edit('Chỉnh sửa năm kinh nghiệm', 'Năm kinh nghiệm', '5.5');
    await edit('Chỉnh sửa gpa tại trường', 'GPA tại trường', '8.5/10');
    await edit('Đổi ảnh đại diện', 'Liên kết ảnh', `${origin}/editor-avatar.svg`);
    await edit('Đổi ảnh dự án Dự án thật của An', 'Liên kết ảnh', `${origin}/editor-avatar.svg`);
    await edit('Đổi ảnh bài viết Bài viết của An', 'Liên kết ảnh', `${origin}/editor-avatar.svg`);
    assert.ok((await page.locator('[data-testid="landscape-stats"]:visible').innerText()).includes('5.5+')); assert.ok((await page.locator('[data-testid="landscape-stats"]:visible').innerText()).includes('8.5/10'));
    assert.equal(await page.getByRole('button', { name: /Chỉnh sửa.*(dự án|công nghệ)/i }).count(), 0, 'Derived counts are read-only');
    await page.getByRole('button', { name: 'Quay lại xem mẫu', exact: true }).click(); await page.getByRole('button', { name: 'Tiếp tục chỉnh sửa', exact: true }).click();
    failSave = true; await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click(); await page.getByText('Lỗi lưu kiểm thử', { exact: true }).waitFor();
    failSave = false; await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click(); await page.getByText('Đã lưu hồ sơ.', { exact: true }).waitFor();
    assert.equal(writes, 2); assert.equal(real.profile.fullName, 'Nguyễn An Mới'); assert.equal(real.profile.bio, 'Giới thiệu thật của An');
    assert.equal(real.portfolio.yearsOfExperience, 5.5); assert.equal(real.portfolio.gpa, '8.5/10'); assert.equal(real.portfolio.projects.length, 1); assert.equal(real.portfolio.skills.length, 1);
    assert.equal(real.portfolio.projects[0].coverUrl, `${origin}/editor-avatar.svg`); assert.equal(real.portfolio.articles[0].coverUrl, `${origin}/editor-avatar.svg`);
    assert.equal(real.portfolio.activities[0].title, 'Existing activity'); assert.equal(real.portfolio.languages[0].name, 'Existing language'); assert.equal(real.portfolio.isPublic, false);
    assert.deepEqual(real.portfolio.appearance.profile.hiddenSections, ['skills', 'languages']);
    await page.getByRole('button', { name: 'Quay lại xem mẫu', exact: true }).click(); await page.getByRole('button', { name: 'Quay lại mẫu hồ sơ', exact: true }).click();
    for (const [template, name] of Object.entries(templates)) for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await page.getByRole('button', { name: `Xem trước ${name}`, exact: true }).click(); await page.getByRole('button', { name: 'Chọn mẫu này', exact: true }).click();
      await page.getByRole('button', { name: 'Thêm dự án', exact: true }).waitFor();
      for (const label of ['Thêm kỹ năng', 'Thêm học vấn', 'Thêm kinh nghiệm', 'Thêm chứng chỉ', 'Thêm bài viết']) assert.equal(await page.getByRole('button', { name: label, exact: true }).count(), 1, `${template} supports ${label} at its own section`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${template} at ${width}`);
      assert.equal(await page.getByRole('heading', { name: 'Nguyễn An Mới', exact: true }).count(), 1);
      assert.equal(await page.getByRole('heading', { name: 'Hành trình phát triển', exact: true }).count(), 1);
      assert.equal(await page.getByRole('heading', { name: 'Ngôn ngữ', exact: true }).count(), 0);
      if (template !== 'developer-modern') assert.equal(await page.getByRole('heading', { name: 'Hoạt động', exact: true }).count(), 0);
      await page.getByRole('button', { name: 'Chỉnh sửa họ và tên', exact: true }).waitFor(); await page.getByRole('button', { name: 'Đổi ảnh đại diện', exact: true }).waitFor();
      const avatar = template === 'developer-modern' ? null : await page.locator(`[data-testid="${template === 'developer-landscape' ? 'landscape-portrait' : 'showcase-portrait'}"]:visible`).boundingBox();
      const camera = await page.getByRole('button', { name: 'Đổi ảnh đại diện', exact: true }).boundingBox();
      if (avatar) { assert.ok(camera.x > avatar.x + avatar.width / 2); assert.ok(camera.y > avatar.y + avatar.height / 2); }
      await page.getByRole('button', { name: 'Chỉnh sửa họ và tên', exact: true }).scrollIntoViewIfNeeded(); await page.screenshot({ path: `dist/profile-verification/editor-native-${template}-${width}.png` });
      await page.getByRole('heading', { name: 'Hành trình phát triển', exact: true }).scrollIntoViewIfNeeded(); await page.screenshot({ path: `dist/profile-verification/editor-native-sections-${template}-${width}.png` });
      await page.getByRole('button', { name: 'Quay lại xem mẫu', exact: true }).click(); await page.getByRole('button', { name: 'Quay lại mẫu hồ sơ', exact: true }).click();
    }
    failLoad = true; await page.getByRole('button', { name: 'Xem trước Developer Landscape', exact: true }).click(); await page.getByRole('button', { name: 'Chọn mẫu này', exact: true }).click(); await page.getByText('Lỗi tải kiểm thử', { exact: true }).waitFor();
    failLoad = false; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await page.getByRole('button', { name: 'Thêm dự án', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('Verified native template section grouping/footer, empty edit slots, pencil fields, camera placement, manual years/GPA, derived counts, additions, atomic editor payload, save/load retry and all templates at 320/768/1440px.');
  } catch (error) { await page.screenshot({ path: 'dist/profile-verification/editor-failure.png' }); console.error('Failure page:', page.url(), (await page.locator('body').innerText()).slice(0, 1200)); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
