const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function moduleAt(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, AbortController, Date, setTimeout, clearTimeout });
  return exports;
}
const { createGitHubRefresh } = moduleAt('src/utils/github-refresh.ts');
const { githubLinkStatus } = moduleAt('src/utils/github-link-status.ts');
function clock() {
  let time = 0, id = 0; const tasks = new Map();
  return { now: () => time, later: (fn, ms) => { const key = ++id; tasks.set(key, { at: time + ms, fn }); return key; }, cancel: key => tasks.delete(key),
    async advance(ms) { const end = time + ms; for (;;) { const item = [...tasks].sort((a,b) => a[1].at - b[1].at)[0]; if (!item || item[1].at > end) break; time = item[1].at; tasks.delete(item[0]); item[1].fn(); for (let i = 0; i < 12; i++) await Promise.resolve(); } time = end; await Promise.resolve(); },
    get size() { return tasks.size; } };
}
test('linked/authorization/sync remain independent; pending activation is not an absent link', () => {
  const repo = { accessStatus: 0, syncReadiness: 'PendingActivation', syncPaused: true, unlinkedAt: null };
  const pending = githubLinkStatus(repo);
  assert.equal(pending.link, 'Đã liên kết'); assert.match(pending.authorization, /chờ xác minh/); assert.equal(pending.sync, 'Đồng bộ đang tạm dừng');
  const completed = githubLinkStatus({ ...repo, accessStatus: 1, syncPaused: false }, { latestJob: { status: 2 } });
  assert.equal(completed.sync, 'Lần đồng bộ gần nhất đã hoàn tất'); assert.doesNotMatch(completed.sync, /^Sẵn sàng/);
  assert.match(githubLinkStatus({ ...repo, accessStatus: 2 }).authorization, /Mất quyền/);
  assert.match(githubLinkStatus({ ...repo, accessStatus: 1, syncReadiness: 'VerificationPending' }).authorization, /xác minh lại/);
  assert.equal(githubLinkStatus(repo, undefined, true).link, 'Không thể kiểm tra trạng thái');
});
test('duplicate triggers share one in-flight read', async () => {
  const time = clock(); let resolve, calls = 0; const states = [];
  const runner = createGitHubRefresh({ ...time, now: time.now, later: time.later, cancel: time.cancel, run: () => { calls++; return new Promise(r => { resolve = r; }); }, onState: x => states.push(x) });
  const first = runner.trigger(); await runner.trigger(); await runner.trigger(); assert.equal(calls, 1);
  resolve(false); await first; assert.equal(states.at(-1), 'idle'); runner.dispose(); assert.equal(time.size, 0);
});
test('waiting has backoff and stops after exactly five attempts, with a visible timeout', async () => {
  const time = clock(); let calls = 0; const states = [];
  const runner = createGitHubRefresh({ now: time.now, later: time.later, cancel: time.cancel, run: async () => { calls++; return false; }, onState: x => states.push(x) });
  runner.wait(); await time.advance(90001); assert.equal(calls, 5); assert.equal(states.at(-1), 'timeout');
  await time.advance(600000); assert.equal(calls, 5); runner.dispose();
});
test('authoritative permission change stops polling without an automatic link action', async () => {
  const time = clock(); let calls = 0;
  const runner = createGitHubRefresh({ now: time.now, later: time.later, cancel: time.cancel, run: async () => { calls++; return true; }, onState() {} });
  runner.wait(); await time.advance(90001); assert.equal(calls, 1); assert.equal(time.size, 0); runner.dispose();
});
test('inactive app suspends polling and foreground revalidates once even after the waiting deadline', async () => {
  const time = clock(); let calls = 0;
  const runner = createGitHubRefresh({ now: time.now, later: time.later, cancel: time.cancel, run: async () => { calls++; return false; }, onState() {} });
  runner.wait(); runner.setActive(false); await time.advance(120000); assert.equal(calls, 0);
  runner.setActive(true); await Promise.resolve(); await Promise.resolve(); assert.equal(calls, 1);
  runner.dispose(); assert.equal(time.size, 0);
});
test('scope disposal aborts old response and cancels all outstanding timers', async () => {
  const time = clock(); let finish, signal, writes = 0;
  const runner = createGitHubRefresh({ now: time.now, later: time.later, cancel: time.cancel, run: async s => { signal = s; await new Promise(r => { finish = r; }); if (!s.aborted) writes++; return true; }, onState() {} });
  const pending = runner.trigger(); runner.dispose(); finish(); await pending;
  assert.equal(signal.aborted, true); assert.equal(writes, 0); assert.equal(time.size, 0);
});
test('provider timeout aborts request and ignores a late success', async () => {
  const time = clock(); let finish; const states = [];
  const runner = createGitHubRefresh({ now: time.now, later: time.later, cancel: time.cancel, run: () => new Promise(r => { finish = r; }), onState: x => states.push(x) });
  const pending = runner.trigger(); await time.advance(20001); assert.equal(states.at(-1), 'timeout'); finish(true); await pending;
  assert.equal(states.at(-1), 'timeout'); runner.dispose();
});
test('a fast foreground return is coalesced, not lost, and has no continuous background refresh', async () => {
  const time = clock(); let calls = 0;
  const runner = createGitHubRefresh({ now: time.now, later: time.later, cancel: time.cancel, run: async () => { calls++; return false; }, onState() {} });
  await runner.trigger(); runner.setActive(false); runner.setActive(true); void runner.trigger(); void runner.trigger();
  await time.advance(1501); assert.equal(calls, 2);
  await time.advance(90000); assert.equal(calls, 2); runner.dispose();
});
test('permanent permission denial stops waiting and is never emitted as success', async () => {
  const time = clock(); let calls = 0; const states = [];
  const runner = createGitHubRefresh({ now: time.now, later: time.later, cancel: time.cancel, run: async () => { calls++; throw { code: 'FORBIDDEN' }; }, terminalError: e => e.code === 'FORBIDDEN', onState: x => states.push(x) });
  runner.wait(); await time.advance(90001); assert.equal(calls, 1); assert.equal(states.at(-1), 'error'); assert.equal(time.size, 0); runner.dispose();
});
