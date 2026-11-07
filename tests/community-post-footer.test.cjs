const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/community/CommunityPostFooter.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports: exportsObject, require: name => {
  if (name === 'react-native') return { Platform: { OS: 'web' }, View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: value => value, hairlineWidth: 1 } };
  if (name === 'expo-symbols') return { SymbolView: 'Symbol' };
  if (name === '@/constants/colors') return { colors: { primary: 'blue', textSecondary: 'gray' } };
  return require(name);
} });
const render = props => exportsObject.CommunityPostFooter(props);
const children = node => React.Children.toArray(node.props?.children);
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : children(node).map(text).join('');

test('statistics align right with labeled like counts and a dot before comments', () => {
  const stats = children(render({ favoriteCount: 1200, commentCount: 89 }))[0];
  assert.equal(text(children(stats)[0]), '1.200 lượt thích');
  assert.ok(text(stats).includes('89'));
  assert.equal(stats.props.style.justifyContent, 'flex-end');
  assert.equal(text(children(stats)[1]), '·');
  assert.equal(children(stats).some(child => child.type === 'Symbol'), false);
});
test('footer actions invoke their own handlers and expose selected likes', () => {
  const calls = [];
  const actions = children(render({ liked: true, onLike: () => calls.push('like'), onComment: () => calls.push('comment'), onShare: () => calls.push('share') })).at(-1);
  const buttons = children(actions);
  buttons.forEach(button => button.props.onPress());
  assert.deepEqual(calls, ['like', 'comment', 'share']);
  assert.equal(buttons[0].props.accessibilityState.selected, true);
});
test('missing handlers disable actions without inventing counts', () => {
  const tree = render({ onShare: () => {} });
  const actions = children(tree);
  assert.equal(actions.length, 1);
  assert.deepEqual(children(actions[0]).map(button => button.props.disabled), [true, true, false]);
});
