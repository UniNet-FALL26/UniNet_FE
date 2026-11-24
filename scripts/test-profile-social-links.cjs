const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');

function setup(editing) {
  const code = ts.transpileModule(fs.readFileSync('src/components/profile/templates/developer-modern/PortfolioPrimitives.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const opened = [];
  const imports = {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    'expo-symbols': { SymbolView: 'SymbolView' },
    'react-native': { Linking: { openURL: url => { opened.push(url); return Promise.resolve(); } }, Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: value => value } },
    '@/components/profile/ProfileEditContext': { useProfileEditing: () => editing },
    '@/components/profile/profile-media': { isSampleLink: url => url === 'https://example.com' },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => imports[name], module, module.exports);
  return { ...module.exports, opened };
}
function nodes(node) { return React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(nodes)] : []; }
const first = { label: 'Website', url: 'https://first.dev' };
const second = { label: 'Website', url: 'https://second.dev' };
const theme = { accentStrong: '#fff', accentSoft: '#123' };

test('remove targets the original social link and never opens its URL', () => {
  const removed = [];
  const { PortfolioLink, opened } = setup({ data: { portfolio: { socialLinks: [first, second] } }, disabled: false, onRemoveSocialLink: index => removed.push(index) });
  const tree = nodes(PortfolioLink({ ...second, socialLink: second, theme }));
  const remove = tree.find(n => n.props.accessibilityLabel === 'Gỡ liên kết Website');
  assert.ok(remove);
  remove.props.onPress();
  assert.deepEqual(removed, [1]);
  assert.deepEqual(opened, []);
  assert.equal(tree.filter(n => n.props.accessibilityRole === 'link').length, 1);
});

test('remove is disabled while saving and absent from public/thumbnail/non-social links', () => {
  const editing = { data: { portfolio: { socialLinks: [first] } }, disabled: true };
  const { PortfolioLink } = setup(editing);
  const props = { ...first, socialLink: first, theme };
  assert.equal(nodes(PortfolioLink(props)).find(n => n.props.accessibilityRole === 'button').props.disabled, true);
  for (const tree of [PortfolioLink({ ...props, thumbnail: true }), PortfolioLink({ ...first, theme }), setup(null).PortfolioLink(props)]) {
    assert.equal(nodes(tree).filter(n => n.props.accessibilityRole === 'button').length, 0);
  }
});
