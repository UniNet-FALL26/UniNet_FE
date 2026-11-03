const { chromium } = require('C:/Users/minec/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict'), fs = require('node:fs');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://localhost:8081';
const longText = count => Array.from({ length: count }, (_, index) => `Dòng ${index + 1}: Kinh nghiệm phát triển phần mềm.`).join('\n');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const template of ['developer-modern', 'developer-showcase', 'developer-landscape']) for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } }); const page = await context.newPage(); page.setDefaultTimeout(15000);
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const profile = { id: 'profile', fullName: 'Student Fixture', nickname: 'student', displayName: 'student', avatarUrl: null, coverUrl: null, bio: longText(8), universityName: 'University', major: 'Software', organizationName: null, isVerified: false };
      const account = { id: 'student', email: 'student@fixture.test', role: 0, status: 1, profileComplete: true, profile };
      let data = { profile, isOwner: true, skillCatalog: [], portfolio: { headline: 'Software Developer', careerObjective: null, location: null, availability: null, contactEmail: null, cvUrl: null, isPublic: false,
        appearance: { profile: { template, theme: 'blue', font: 'Inter', sectionOrder: [], hiddenSections: [] } }, skills: [], education: [], experience: [], projects: [], certificates: [], activities: [], languages: [], articles: [], socialLinks: [] } };
      let writes = 0, saved;
      await page.routeWebSocket('**/hubs/notifications**', socket => socket.onMessage(value => { if (String(value).includes('"protocol"')) socket.send('{}\x1e'); }));
      await page.route('**/api/**', route => {
        const request = route.request(), path = new URL(request.url()).pathname, ok = json => route.fulfill({ json });
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
        if (path.endsWith('/auth/login')) return ok({ account, accessToken: 'fixture', refreshToken: 'fixture-refresh', requiresProfileCompletion: false });
        if (path.endsWith('/auth/me') || path.endsWith('/profile/me')) return ok(account);
        if (path.endsWith('/profile/portfolio/editor/me')) { writes++; saved = request.postDataJSON(); data = { ...data, ...saved }; return ok(data); }
        if (path.endsWith('/profile/portfolio/me')) return ok(data);
        if (path.endsWith('/notifications/summary')) return ok({ unreadCount: 0, canManage: false }); return ok([]);
      });
      await page.goto(origin + '/login');
      await page.waitForFunction(() => [...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(input => Object.keys(input).some(key => key.startsWith('__reactProps') && typeof input[key]?.onChange === 'function')));
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email); await page.getByRole('textbox', { name: 'Mật khẩu', exact: true }).fill('fixture-password');
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await page.waitForURL(url => !url.pathname.includes('/login'));
      await page.goto(`${origin}/profile/editor?template=${template}&theme=blue`);
      const editBio = page.getByRole('button', { name: 'Chỉnh sửa giới thiệu', exact: true }); await editBio.click();
      const bio = page.getByRole('textbox', { name: 'Giới thiệu', exact: true }); await bio.waitFor();
      const assertFit = async locator => {
        await page.waitForFunction(label => { const input = document.querySelector(`textarea[aria-label="${label}"]`); return input && input.scrollHeight <= input.clientHeight + 2; }, await locator.getAttribute('aria-label'));
        const style = await locator.evaluate(input => ({ background: getComputedStyle(input).backgroundColor, outline: getComputedStyle(input).outlineWidth, border: getComputedStyle(input).borderTopColor, active: document.activeElement === input, height: input.getBoundingClientRect().height }));
        assert.equal(style.background, 'rgb(255, 255, 255)'); assert.equal(style.outline, '0px'); if (style.active) assert.equal(style.border, 'rgb(23, 105, 224)'); return style.height;
      };
      const initial = await assertFit(bio); await bio.fill(longText(24)); const expanded = await assertFit(bio); assert.ok(expanded > initial + 100);
      await bio.fill('Giới thiệu ngắn'); const shrunk = await assertFit(bio); assert.ok(shrunk < expanded - 100);
      await bio.fill(longText(35)); await assertFit(bio);
      const confirm = page.getByRole('button', { name: 'Xác nhận', exact: true }); const cancel = page.getByRole('button', { name: 'Hủy', exact: true });
      for (const button of [confirm, cancel]) { const box = await button.boundingBox(); assert.ok(box.height <= 40 && box.y >= 0 && box.y + box.height <= 900); assert.ok(box.width < 150); }
      await cancel.click(); await editBio.click(); assert.equal(await bio.inputValue(), longText(8));
      await bio.fill('Giới thiệu đã cập nhật'); await confirm.click(); assert.equal(writes, 0);
      await page.getByRole('button', { name: 'Thêm học vấn', exact: true }).click();
      const title = page.getByRole('textbox', { name: 'Tên / tiêu đề *', exact: true }); const longTitle = 'Chương trình kỹ thuật phần mềm và nghiên cứu công nghệ '.repeat(4);
      await title.fill(longTitle); await assertFit(title);
      await page.getByRole('textbox', { name: 'Đơn vị / tổ chức', exact: true }).fill('University');
      const description = page.getByRole('textbox', { name: 'Mô tả', exact: true }); await description.fill(longText(18)); await assertFit(description);
      await title.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => { const input = document.querySelector('textarea[aria-label="Tên / tiêu đề *"]'); if (!input) return false; for (let el = input; el; el = el.parentElement) if (Number(getComputedStyle(el).opacity) < 1) return false; return true; });
      fs.mkdirSync('dist/profile-popup-inputs', { recursive: true }); await page.screenshot({ path: `dist/profile-popup-inputs/${template}-${width}.png` });
      await confirm.click(); assert.equal(writes, 0); await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
      await page.getByText('Đã lưu hồ sơ.', { exact: true }).waitFor(); assert.equal(writes, 1);
      assert.equal(saved.profile.bio, 'Giới thiệu đã cập nhật'); assert.equal(saved.portfolio.education[0].title, longTitle.trim()); assert.equal(saved.portfolio.education[0].description, longText(18));
      assert.deepEqual(errors, []); await context.close(); console.log(`${template} ${width}px: white auto-sizing inputs, initial/grow/shrink, compact buttons, cancel/confirm/save passed.`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
