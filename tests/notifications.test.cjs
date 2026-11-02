const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const output = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/notifications.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: output, URL });

test('notification targets accept local business screens only', () => {
  const ownAssessment = '/assessor-assessments/00000000-0000-4000-8000-000000000001';
  assert.equal(output.safeNotificationTarget(ownAssessment), ownAssessment);
  assert.equal(output.safeNotificationTarget('/assessor/projects'), null);
  assert.equal(output.safeNotificationTarget('/assessor-assessments/not-a-guid'), null);
  for (const path of ['/settings?account=1', '/(company)/profile', '/(company)/verification', '/(company)/applicants?jobId=abc', '/group/00000000-0000-4000-8000-000000000001', '/workspace/00000000-0000-4000-8000-000000000001']) assert.equal(output.safeNotificationTarget(path), path);
  for (const path of ['https://evil.test', '//evil.test', '/\\evil.test', 'javascript:alert(1)', '/settings?redirect=https://evil.test', '/settings#https://evil.test', '/%2f%2fevil.test', '/settings%0a', '/login', '/unknown']) assert.equal(output.safeNotificationTarget(path), null, path);
});

test('API notification pages validate shape and preserve independent read states', () => {
  const row = { id: 'a', recipientUserId: 'account-a', type: 'verification.approved', category: 'verification', title: 'Đã xác minh', message: 'Hoàn tất', audience: 'personal', createdAt: '2026-10-25T00:00:00Z', readAt: null };
  const page = output.parseNotificationPage({ items: [row], page: 1, pageSize: 20, total: 1, unreadCount: 1 });
  assert.equal(page.items[0].readAt, null);
  assert.equal(page.unreadCount, 1);
  for (const value of [null, [], { items: [null] }, { items: [{ ...row, createdAt: 'invalid' }], page: 1, pageSize: 20, total: 1, unreadCount: 1 }, { items: [row], page: 1, pageSize: 20, total: 1, unreadCount: -1 }]) assert.throws(() => output.parseNotificationPage(value));
});

test('pagination merges by notification id without duplicate rows', () => {
  const a = { id: 'a', readAt: null }, updated = { id: 'a', readAt: '2026-10-25T01:00:00Z' }, b = { id: 'b' };
  const merged = output.mergeNotifications([a], [updated, b]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].readAt, updated.readAt);
  assert.equal(a.readAt, null);
});

test('calendar groups use local day boundaries and keep yesterday separate from the current week', () => {
  const now = new Date(2026, 9, 26, 12);
  const row = (id, date) => ({ id, createdAt: date.toISOString() });
  const groups = output.groupNotifications([
    row('today', new Date(2026, 9, 26, 0, 1)),
    row('yesterday', new Date(2026, 9, 25, 23, 59)),
    row('older', new Date(2026, 9, 24, 12)),
  ], now);
  assert.equal(JSON.stringify(groups.map(group => [group.label, group.items.map(item => item.id)])), JSON.stringify([
    ['Hôm nay', ['today']], ['Hôm qua', ['yesterday']], ['Trước đó', ['older']],
  ]));
  assert.equal(output.notificationRelativeTime(new Date(now - 5 * 60000).toISOString(), now), '5 phút trước');
  assert.equal(output.notificationRelativeTime('invalid', now), 'Không rõ thời gian');
});

test('category tabs include community and all notifications', () => {
  assert.equal(JSON.stringify(output.notificationCategories.map(item => item.value)), JSON.stringify(['', 'community', 'verification', 'recruitment', 'project', 'system']));
});

test('central icon registry resolves event types before category and has a safe fallback', () => {
  const presentation = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/constants/notification-presentation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: presentation });
  assert.equal(presentation.notificationVisual('community.post.liked', 'community').icon.web, 'favorite_border');
  assert.equal(presentation.notificationVisual('community.comment.created', 'community').icon.web, 'chat_bubble_outline');
  assert.equal(presentation.notificationVisual('community.mentioned', 'community').icon.web, 'alternate_email');
  assert.equal(presentation.notificationVisual('community.comment.replied', 'community').icon.web, 'reply');
  assert.equal(presentation.notificationVisual('verification.student.approved', 'verification').icon.web, 'verified_user');
  assert.equal(presentation.notificationVisual('SystemAnnouncement', 'system').icon.web, 'campaign');
  assert.equal(presentation.notificationVisual('future.event', 'recruitment').icon.web, 'work_outline');
  assert.equal(presentation.notificationVisual('unknown', 'unknown').icon.web, 'notifications_none');
});
