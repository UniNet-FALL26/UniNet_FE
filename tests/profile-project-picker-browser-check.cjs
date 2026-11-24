const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8090';
const account = { id: 'picker-owner', email: 'picker@fixture.test', role: 0, profileComplete: true, profile: { id: 'picker-profile', fullName: 'Nguyễn An', displayName: 'An', showPortfolio: true } };
const eligible = Array.from({ length: 16 }, (_, i) => ({ projectId: `p-${i}`, title: `Dự án ${i}`, description: 'Ứng dụng kết nối sinh viên và chia sẻ kỹ năng.', technologies: ['React', 'ASP.NET Core', 'C#', 'TypeScript', 'SQL'], featured: false }));
let data = { profile: account.profile, isOwner: true, skillCatalog: [], portfolio: { headline: null, appearance: { profile: { template: 'developer-landscape', theme: 'pink', font: 'Inter', sectionOrder: [], hiddenSections: [] } }, skills: [], projects: [{ title: 'Thủ công có sẵn', technologies: [], featured: true }], education: [], experience: [], certificates: [], activities: [], languages: [], articles: [], socialLinks: [] } };
(async () => {
 const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
 const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
 page.setDefaultTimeout(15000);
 let saves = 0, creates = 0, failSave = false, failCreate = false;
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 await page.route('**/*', async route => {
  const req = route.request(), url = new URL(req.url()), path = url.pathname;
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
  if (path.endsWith('/auth/login')) return route.fulfill({ json: { account, accessToken: 'fixture-access', refreshToken: 'fixture-refresh', requiresProfileCompletion: false } });
  if (path.endsWith('/auth/me') || path.endsWith('/profile/me')) return route.fulfill({ json: account });
  if (path.endsWith('/profile/portfolio/me/eligible-projects')) return route.fulfill({ json: eligible });
  if (path.endsWith('/profile/portfolio/me')) return route.fulfill({ json: data });
  if (path.endsWith('/profile/portfolio/editor/me')) {
   saves++; if (failSave) return route.fulfill({ status: 400, json: { message: 'Không lưu được hồ sơ kiểm thử' } });
   const body = req.postDataJSON();
   const projects = body.portfolio.projects.map(p => p.projectId ? { ...eligible.find(item => item.projectId === p.projectId), ...p } : p);
   data = { ...data, portfolio: { ...body.portfolio, projects }, profile: { ...data.profile, ...body.profile } }; return route.fulfill({ json: data });
  }
  if (path.endsWith('/project-hub') && req.method() === 'POST') { creates++; return failCreate ? route.fulfill({ status: 400, json: { message: 'Không tạo được dự án kiểm thử' } }) : route.fulfill({ json: { id: 'new-project', ...req.postDataJSON(), isOwner: true } }); }
  if (path.startsWith('/api/')) return route.fulfill({ json: [] });
  return route.continue();
 });
 try {
  fs.mkdirSync('dist/profile-project-picker', { recursive: true });
  await page.goto(origin + '/profile/editor');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.reload();
  await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
  await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(url => !url.pathname.includes('/login'));
  await page.goto(origin + '/profile/editor');
  const openPicker = () => page.getByRole('button', { name: 'Thêm dự án', exact: true }).click();
  await openPicker();
  await page.getByText('Thêm dự án vào hồ sơ', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Nhập dự án thủ công', exact: true }).count(), 0);
  assert.equal(await page.getByRole('tablist', { name: 'Nguồn dự án' }).count(), 0);
  await page.getByRole('checkbox', { name: 'Dự án 0', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Dự án 1', exact: true }).click();
  assert.equal(await page.getByText('Đóng góp, nổi bật và thứ tự', { exact: true }).count(), 0);
  const selectedRow = page.getByRole('checkbox', { name: 'Dự án 0', exact: true });
  const unselectedRow = page.getByRole('checkbox', { name: 'Dự án 2', exact: true });
  assert.equal(await selectedRow.getAttribute('aria-checked'), 'true');
  assert.notEqual(await selectedRow.evaluate(el => getComputedStyle(el.parentElement).backgroundColor), await unselectedRow.evaluate(el => getComputedStyle(el.parentElement).backgroundColor));
  await page.getByText('Đã chọn: 3 dự án', { exact: true }).waitFor();
  await page.getByRole('checkbox', { name: 'Thủ công có sẵn', exact: true }).waitFor();
  for (const width of [320, 768, 1024, 1440]) {
   await page.setViewportSize({ width, height: 850 });
   await page.screenshot({ path: `dist/profile-project-picker/${width}.png` });
   const box = await page.getByTestId('profile-project-picker').boundingBox();
   assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
  }
  await page.getByRole('button', { name: 'Thêm dự án mới', exact: true }).click();
  await page.getByText('Lưu thay đổi trước khi tạo dự án?', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Tiếp tục chỉnh sửa', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Dự án 0', exact: true }).waitFor();
  assert.equal(await page.getByRole('checkbox', { name: 'Dự án 0', exact: true }).getAttribute('aria-checked'), 'true');
  await page.getByRole('button', { name: 'Thêm dự án mới', exact: true }).click();
  failSave = true;
  await page.getByRole('button', { name: 'Lưu và tạo dự án', exact: true }).click();
  await page.getByRole('dialog', { name: 'Lưu thay đổi hồ sơ' }).getByRole('alert').waitFor();
  assert.equal(creates, 0);
  failSave = false;
  await page.getByRole('button', { name: 'Lưu và tạo dự án', exact: true }).click();
  await page.getByTestId('project-create-title').fill('Dự án mới từ hồ sơ');
  await page.getByTestId('project-create-description').fill('Mô tả dự án mới');
  assert.deepEqual(data.portfolio.projects.map(p => p.title), ['Thủ công có sẵn', 'Dự án 0', 'Dự án 1']);
  failCreate = true;
  await page.getByTestId('project-create-submit').click();
  await page.getByRole('alert').filter({ hasText: 'Không tạo được' }).last().waitFor();
  failCreate = false;
  await page.getByTestId('project-create-submit').click();
  await page.getByText('Thêm dự án vào hồ sơ', { exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname, '/profile/editor');
  assert.equal(creates, 2); assert.equal(saves, 2);
  await page.getByRole('button', { name: 'Thêm dự án mới', exact: true }).click();
  await page.getByTestId('project-create-title').waitFor();
  assert.equal(await page.getByText('Lưu thay đổi trước khi tạo dự án?', { exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await page.getByText('Đã chọn: 3 dự án', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await page.locator('[role="button"][aria-label^="Chọn màu"][aria-pressed="false"]').first().click();
  await openPicker();
  await page.getByRole('button', { name: 'Thêm dự án mới', exact: true }).click();
  await page.getByText('Lưu thay đổi trước khi tạo dự án?', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Tiếp tục chỉnh sửa', exact: true }).click();
  assert.equal(saves, 2, 'canceling confirmation must not write changed profile appearance');
  assert.deepEqual(errors, []);
  console.log('PASS: unified list/selection; 4 viewport sizes; cancel/failed save/save/create failure/success/clean creation/return route.');
 } catch (e) { await page.screenshot({ path: 'dist/profile-project-picker/failure.png' }); throw e; }
 finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
