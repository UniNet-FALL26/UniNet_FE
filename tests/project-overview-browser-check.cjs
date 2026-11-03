const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const runtime = process.env.CODEX_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(runtime);
const root = path.resolve('dist/project-detail-web');
const server = http.createServer((req, res) => {
  let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '');
  if (name === 'group/fixture') name = 'group/[id]';
  let file = path.resolve(root, name);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  else if (!fs.existsSync(file)) file += '.html';
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' }[path.extname(file)] || 'application/octet-stream';
  res.setHeader('Content-Type', type); fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ timezoneId: 'Asia/Ho_Chi_Minh' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    let role = 'creator', status = 1, recruitment = 0, mutations = 0;
    const account = { id: 'viewer', email: 'fixture@example.com', role: 0, status: 1, profileComplete: true, profile: { id: 'profile', fullName: 'Người dùng UniNet', isVerified: false } };
    const detail = () => ({ id: 'fixture', title: 'GreenSpace - Sustainable Living App', projectField: 'Environmental Technology', description: 'GreenSpace là ứng dụng giúp người dùng xây dựng thói quen sống xanh, theo dõi các hành động thân thiện với môi trường và tham gia hoạt động cộng đồng.', status, recruitmentStatus: recruitment, visibility: 1, memberTarget: 5, minimumQuantity: 2, currentMemberCount: 1, createdAt: '2026-11-01T02:00:00Z', updatedAt: null, expectedOutput: '2026-12-01T02:00:00Z', recruitmentDeadline: '2026-11-20T02:00:00Z', creator: { id: 'creator', fullName: 'Trịnh Trọng Quyền', nickname: 'quyen', avatarUrl: null }, members: [{ userId: 'member', fullName: 'Nguyễn Minh Khoa', role: 'Phát triển Backend', nickname: 'khoa', avatarUrl: null, status: 0, joinedAt: '2026-11-02T02:00:00Z' }], roleRequirements: [{ id: 'role', roleName: 'Phát triển Frontend', quantity: 2, requirements: 'Có kinh nghiệm React Native và làm việc nhóm.' }], skills: [{ skillId: 'react', skillName: 'React Native', iconUrl: null }, { skillId: 'postgres', skillName: 'PostgreSQL', iconUrl: null }], isCreator: role === 'creator', isMember: role === 'member', invitations: [], joinRequests: [] });
    await page.addInitScript(() => sessionStorage.setItem('uninet.session.v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: '2099-01-01T00:00:00Z' })));
    await page.routeWebSocket('**/hubs/notifications**', socket => socket.onMessage(v => { if (String(v).includes('protocol')) socket.send('{}\x1e'); }));
    await page.route('**/api/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      let json = [];
      if (!['GET', 'OPTIONS'].includes(route.request().method())) mutations++;
      if (pathname.endsWith('/auth/me')) json = account;
      else if (pathname.endsWith('/projects/fixture')) json = detail();
      else if (pathname.endsWith('/unread-count')) json = { count: 0 };
      else if (pathname.includes('verifications')) json = { verifications: [], page: 1, totalPages: 0 };
      else if (pathname.endsWith('/contribution')) json = { status: 2 };
      else if (pathname.includes('evidence-moderation')) return route.fulfill({ status: 404, json: { code: 'LEVEL1_NOT_FOUND', message: 'Chưa có kết quả' }, headers: { 'Access-Control-Allow-Origin': '*' } });
      await route.fulfill({ json, headers: { 'Access-Control-Allow-Origin': '*' } });
    });
    const output = path.join(root, 'checks'); fs.mkdirSync(output, { recursive: true });
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (status of [0, 1, 2, 3]) for (role of ['creator', 'member', 'guest']) {
        recruitment = 0;
        await page.goto(origin + '/group/fixture');
        await page.getByTestId('project-overview').waitFor();
        await page.getByRole('heading', { name: 'Giới thiệu dự án', exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Rời dự án', exact: true }).count(), status === 1 && role === 'member' ? 1 : 0);
        assert.equal(await page.getByRole('button', { name: 'Xóa thành viên', exact: true }).count(), status === 1 && role === 'creator' ? 1 : 0);
        assert.equal(await page.getByRole('button', { name: 'Gửi đơn ứng tuyển', exact: true }).count(), status === 1 && role === 'guest' ? 1 : 0);
        assert.equal(await page.getByRole('button', { name: 'Xóa dự án', exact: true }).count(), status === 3 && role === 'creator' ? 1 : 0);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'overflow ' + [width,status,role]);
        const main = await page.getByTestId('project-overview-main').boundingBox(), side = await page.getByTestId('project-overview-sidebar').boundingBox();
        if (width >= 1000) assert(side.x > main.x + main.width, 'desktop sidebar is on the right');
        else assert(side.y >= main.y + main.height, 'mobile sidebar follows main content');
        if (role === 'creator' && [1440,390].includes(width)) { await page.evaluate(() => { document.querySelectorAll('*').forEach(el => { if (el.scrollHeight > el.clientHeight) el.scrollTop = 0; }); }); await page.screenshot({ path: path.join(output, 'project-' + status + '-' + width + '.png'), fullPage: true }); }
      }
    }
    status=1; role='guest';
    for (recruitment of [1,2,3,4]) { await page.goto(origin + '/group/fixture'); await page.getByTestId('project-overview').waitFor(); assert.equal(await page.getByRole('button', { name: 'Gửi đơn ứng tuyển', exact: true }).count(), 0); }
    assert.equal(mutations, 0); assert.deepEqual(errors, []);
    console.log('PASS: 48 combinations of project status, viewer role and viewport; closed recruitment states; responsive columns; no page errors.');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
