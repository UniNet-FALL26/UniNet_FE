const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
function load(file, imports) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => { if (!(name in imports)) throw Error(name); return imports[name]; }, module, module.exports);
  return module.exports;
}
function nodes(node) {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray(node.props.children).flatMap(nodes)];
}
for (const os of ['android', 'ios']) test(`${os}: keyboard avoidance wraps the sheet and successful sends dismiss the keyboard`, async () => {
  let stateIndex = 0, dismissed = 0, count = 0;
  const native = Object.fromEntries(['ActivityIndicator', 'Image', 'KeyboardAvoidingView', 'Modal', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View'].map(name => [name, name]));
  Object.assign(native, { Alert: { alert() { assert.fail('unexpected error'); } }, Keyboard: { dismiss() { dismissed++; } }, Platform: { OS: os }, StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width: 390, height: 844 }) });
  const { CommentModal } = load('src/components/community/CommentModal.tsx', {
    react: { useEffect() {}, useRef: () => ({ current: null }), useState: initial => [stateIndex++ === 3 ? 'A comment' : initial, () => {}] },
    'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': native,
    '@/constants/colors': { colors: {} }, 'expo-symbols': { SymbolView: 'SymbolView' }, './CommentItem': { CommentItem: 'CommentItem' },
    '@/store/auth.store': { useAuthStore: () => ({ account: { id: 'viewer' } }) },
    '@/services/community.service': { communityService: { createComment: async () => ({ id: 'comment' }) } },
  });
  const tree = nodes(CommentModal({ post: { id: 'post', authorUserId: 'author', mediaUrls: [] }, onCommentCountChange: () => count++, onClose() {} }));
  const avoider = tree.find(n => n.type === 'KeyboardAvoidingView');
  assert.equal(avoider.props.behavior, os === 'ios' ? 'padding' : 'height');
  assert.ok(nodes(avoider).some(n => n.props.testID === 'community-comments-sheet'));
  assert.notEqual(avoider.props.testID, 'community-comments-sheet');
  await tree.find(n => n.props.accessibilityLabel === 'Gửi bình luận').props.onPress();
  assert.equal(dismissed, 1);
  assert.equal(count, 1);
});
test('comment and reply success feedback is suppressed', async () => {
  const calls = [];
  const { communityService } = load('src/services/community.service.ts', { './api': { apiRequest: async (...args) => calls.push(args) }, '@/services/api': { apiRequest: async (...args) => calls.push(args) } });
  await communityService.createComment('post', { content: 'Comment' });
  await communityService.createReply('comment', { content: 'Reply', replyToUserId: 'author' });
  assert.equal(calls.length, 2);
  for (const [, options] of calls) assert.equal(options.feedback?.success, false);
});
for (const [width, own] of [[390, true], [390, false], [1280, true], [1280, false]]) test(`comment menu at width ${width}, own=${own}`, () => {
  let selected = null, edited = null, deleted = null, replied = null, reported = null;
  const { CommentItem } = load('src/components/community/CommentItem.tsx', {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { Image: 'Image', Pressable: 'Pressable', Text: 'Text', View: 'View', Modal: 'Modal', Keyboard: { dismiss() {} }, StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width }) },
    '@/constants/colors': { colors: {} }, 'expo-symbols': { SymbolView: 'SymbolView' },
    '@/store/auth.store': { useAuthStore: () => ({ account: { id: own ? 'author' : 'viewer' } }) },
  });
  const comment = { id: 'comment', authorUserId: 'author', authorName: 'Author', content: 'Comment', createdAt: '2026-11-20', replies: [] };
  const render = () => nodes(CommentItem({ comment, optionsCommentId: selected, setOptionsCommentId: value => { selected = typeof value === 'function' ? value(selected) : value; }, onEdit: value => edited = value, onDelete: value => deleted = value, onReply: value => replied = value, onReport: value => reported = value }));
  let tree = render();
  assert.equal(tree.filter(n => n.type === 'SymbolView' && n.props.name?.android === 'more_horiz').length, 0);
  assert.equal(tree.filter(n => n.props.onLongPress).length, 1);
  tree.find(n => n.props.onLongPress).props.onLongPress();
  assert.equal(selected, 'comment');
  tree = render();
  assert.equal(tree.find(n => n.type === 'Modal').props.visible, true);
  assert.ok(tree.filter(n => n.type === 'SymbolView').length >= (own ? 3 : 2));
  const action = label => tree.find(n => n.props.accessibilityLabel === label);
  action('Phản hồi bình luận').props.onPress();
  assert.equal(replied, 'comment'); assert.equal(selected, null);
  if (own) {
    action('Sửa bình luận').props.onPress(); assert.equal(edited, comment);
    action('Xóa bình luận').props.onPress(); assert.equal(deleted, 'comment');
  } else { assert.equal(action('Sửa bình luận'), undefined); assert.equal(action('Xóa bình luận'), undefined); }
});
test('comment reports preserve the target and content in the existing moderation queue', async () => {
  const calls = [];
  const { communityService } = load('src/services/community.service.ts', { '@/services/api': { apiRequest: async (...args) => calls.push(args) } });
  await communityService.reportComment('post/1', { id: 'reply-1', authorName: 'Author', content: 'Reported text' }, 'Spam');
  const [route, options] = calls[0];
  assert.equal(route, '/community/posts/post%2F1/report');
  assert.equal(options.method, 'POST');
  const { reason } = JSON.parse(options.body);
  for (const value of ['reply-1', 'Author', 'Reported text', 'Spam']) assert.ok(reason.includes(value));
  assert.equal(options.feedback.error, false);
});
test('report dialog requires a reason and retains the report after failure for retry', async () => {
  const values = []; let cursor = 0, attempts = 0;
  const post = { id: 'post', authorUserId: 'author', mediaUrls: [] };
  const comment = { id: 'comment', authorName: 'Author', content: 'Content' };
  const native = Object.fromEntries(['ActivityIndicator', 'Image', 'KeyboardAvoidingView', 'Modal', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View'].map(name => [name, name]));
  Object.assign(native, { Alert: { alert() {} }, Keyboard: { dismiss() {} }, Platform: { OS: 'android' }, StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width: 390 }) });
  const { CommentModal } = load('src/components/community/CommentModal.tsx', {
    react: { useEffect() {}, useRef: () => ({ current: null }), useState: initial => { const index = cursor++; if (!(index in values)) values[index] = initial; return [values[index], value => { values[index] = typeof value === 'function' ? value(values[index]) : value; }]; } },
    'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': native,
    '@/constants/colors': { colors: {} }, 'expo-symbols': { SymbolView: 'SymbolView' }, './CommentItem': { CommentItem: 'CommentItem' },
    '@/store/auth.store': { useAuthStore: () => ({ account: { id: 'viewer' } }) },
    '@/services/community.service': { communityService: { reportComment: async (...args) => { assert.deepEqual(args, ['post', comment, 'Spam hoặc quảng cáo']); if (++attempts === 1) throw Error('offline'); } } },
  });
  values[0] = [comment];
  const render = () => { cursor = 0; return nodes(CommentModal({ post, onClose() {} })); };
  render().find(n => n.type === 'CommentItem').props.onReport(comment);
  let tree = render();
  const send = () => tree.find(n => n.props.accessibilityLabel === 'Gửi báo cáo bình luận');
  assert.equal(send().props.disabled, true);
  tree.find(n => n.props.accessibilityRole === 'radio').props.onPress();
  tree = render(); assert.equal(send().props.disabled, false);
  send().props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  tree = render(); assert.ok(tree.some(n => n.props.accessibilityRole === 'alert'));
  assert.equal(tree.find(n => nodes(n).some(child => child.props.accessibilityLabel === 'Gửi báo cáo bình luận') && n.type === 'Modal').props.visible, true);
  send().props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  tree = render();
  assert.equal(attempts, 2);
  assert.equal(tree.find(n => nodes(n).some(child => child.props.accessibilityLabel === 'Gửi báo cáo bình luận') && n.type === 'Modal').props.visible, false);
});
