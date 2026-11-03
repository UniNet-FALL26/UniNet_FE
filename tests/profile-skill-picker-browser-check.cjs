const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8090';
const catalog = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'React', category: 'Frontend', iconUrl: null },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Python', category: 'Backend', iconUrl: origin + '/skill-icon.png' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Zustand', category: 'Frontend', iconUrl: null },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Tool chưa có logo', category: 'Tools & Other', iconUrl: null },
];
const account = { id: 'skill-picker-owner', email: 'picker@fixture.test', role: 0, profileComplete: true, profile: { id: 'picker-profile', fullName: 'Picker Fixture', displayName: 'Picker', showPortfolio: true } };
const data = { profile: account.profile, isOwner: true, skillCatalog: catalog, portfolio: { headline: null, isPublic: false, appearance: { profile: { template: 'developer-landscape', theme: 'pink', font: 'Inter', sectionOrder: [], hiddenSections: [] } }, skills: [{ skillId: catalog[0].id, name: 'React', category: 'Frontend', iconUrl: null, level: 2, yearsOfExperience: 3 }], projects: [], education: [], experience: [], certificates: [], activities: [], languages: [], articles: [], socialLinks: [] } };
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  let writes = 0, saved;
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
    if (path === '/skill-icon.png') return route.fulfill({ contentType: 'image/png', body: fs.readFileSync('assets/images/profile-samples/developer-portrait.png') });
    if (path.endsWith('/auth/login')) return route.fulfill({ json: { account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false } });
    if (path.endsWith('/auth/me') || path.endsWith('/profile/me')) return route.fulfill({ json: account });
    if (path.endsWith('/profile/portfolio/me')) return route.fulfill({ json: data });
    if (path.endsWith('/profile/portfolio/editor/me')) { writes++; saved = request.postDataJSON(); data.portfolio = saved.portfolio; return route.fulfill({ json: data }); }
    if (path.startsWith('/api/')) return route.fulfill({ json: [] });
    return route.continue();
  });
  try {
    fs.mkdirSync('dist/profile-skill-picker', { recursive: true });
    await page.goto(origin + '/profile/editor?template=developer-landscape&theme=pink');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.reload();
    await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
    await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.getByRole('tab', { name: 'Cá nhân', exact: true }).click();
    await page.getByRole('button', { name: /Đổi mẫu hồ sơ/ }).click();
    await page.getByRole('button', { name: 'Xem Developer Landscape màu Pink Sunset', exact: true }).click();
    await page.getByRole('img', { name: 'Icon React', exact: true }).first().waitFor();
    await page.getByRole('button', { name: 'Chọn mẫu này', exact: true }).click();
    await page.locator('[aria-label="Icon mặc định React"]:visible').waitFor();
    await page.getByRole('button', { name: 'Thêm kỹ năng', exact: true }).click();
    assert.equal(await page.getByText('Mức độ (0–3)', { exact: true }).count(), 0);
    assert.equal(await page.getByText('Số năm kinh nghiệm', { exact: true }).count(), 0);
    assert.equal(await page.getByRole('checkbox', { name: 'React', exact: true }).isDisabled(), false);
    await page.getByRole('button', { name: 'Bỏ chọn React', exact: true }).click();
    await page.getByText('Đã chọn 0 kỹ năng', { exact: true }).waitFor();
    await page.getByRole('checkbox', { name: 'React', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Python', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Zustand', exact: true }).click();
    await page.getByText('Đã chọn 3 kỹ năng', { exact: true }).waitFor();
    await page.getByRole('img', { name: 'Icon Python', exact: true }).first().waitFor();
    await page.getByRole('textbox', { name: 'Tìm kỹ năng', exact: true }).fill('Zustand');
    await page.getByText('Đã chọn 3 kỹ năng', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Bỏ chọn Python', exact: true }).count(), 0, 'filtered skills do not appear in a duplicate selected list');
    await page.getByRole('textbox', { name: 'Tìm kỹ năng', exact: true }).fill('Python');
    await page.getByRole('button', { name: 'Bỏ chọn Python', exact: true }).click();
    await page.getByText('Đã chọn 2 kỹ năng', { exact: true }).waitFor();
    await page.getByRole('textbox', { name: 'Tìm kỹ năng', exact: true }).fill('');
    assert.equal(await page.getByRole('checkbox', { name: 'Python', exact: true }).isChecked(), false);
    await page.getByRole('checkbox', { name: 'Python', exact: true }).click();
    await page.getByRole('button', { name: 'Tên Z–A', exact: true }).click();
    assert.deepEqual(await page.getByRole('checkbox').evaluateAll(elements => elements.map(el => el.getAttribute('aria-label'))), ['Zustand', 'Tool chưa có logo', 'React', 'Python']);
    await page.screenshot({ path: 'dist/profile-skill-picker/desktop.png' });
    for (const width of [320, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth); }
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    assert.equal(writes, 0, 'batch confirmation updates only the draft');
    await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
    await page.getByText('Đã lưu hồ sơ.', { exact: true }).waitFor();
    assert.equal(writes, 1); assert.equal(saved.portfolio.skills.length, 3);
    assert.equal(saved.portfolio.skills[0].level, 2); assert.equal(saved.portfolio.skills[0].yearsOfExperience, 3);
    assert.equal(saved.portfolio.skills.find(skill => skill.name === 'Python').iconUrl, catalog[1].iconUrl);
    await page.getByRole('button', { name: 'Thêm kỹ năng', exact: true }).click();
    await page.getByRole('button', { name: 'Bỏ chọn React', exact: true }).click();
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    assert.equal(writes, 1);
    await page.getByRole('button', { name: 'Thêm kỹ năng', exact: true }).click();
    await page.getByRole('button', { name: 'Bỏ chọn React', exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    assert.equal(writes, 1, 'removal confirmation still only changes the draft');
    await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
    await page.getByText('Đã lưu hồ sơ.', { exact: true }).waitFor();
    assert.equal(writes, 2); assert.equal(saved.portfolio.skills.length, 2);
    assert.equal(saved.portfolio.skills.some(skill => skill.name === 'React'), false);
    assert.deepEqual(errors, []);
    console.log('Skill picker: icons, compact multi-selection, remove X, search/sort persistence, existing skills, draft/batch save and responsive checks passed.');
  } catch (error) { await page.screenshot({ path: 'dist/profile-skill-picker/failure.png' }).catch(() => {}); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
