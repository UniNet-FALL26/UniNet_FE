const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');

const imports = {
  react: { createContext: () => ({ Provider: 'Provider' }), useContext: () => false, useRef: value => ({ current: value }), useEffect() {} },
  'react/jsx-runtime': require('react/jsx-runtime'),
  'react-native': { Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width: 900, height: 900 }) },
  'expo-symbols': { SymbolView: 'SymbolView' },
  '@/constants/colors': { colors: {} },
  './FullProjectImage': { FullProjectImage: 'FullProjectImage' },
};
const source = fs.readFileSync(path.join(__dirname, '../src/components/projects/hub/ProjectHubUI.tsx'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', code)(name => { if (!(name in imports)) throw Error(name); return imports[name]; }, loaded, loaded.exports);
function buttons(node) {
  if (!React.isValidElement(node)) return [];
  return [...(node.type === 'Pressable' && node.props.accessible !== false ? [node] : []), ...React.Children.toArray(node.props.children).flatMap(buttons)];
}
test('settings popups expose only the left back button regardless of their icon', () => {
  for (const icon of ['back', 'clock', 'people', 'image', 'folder']) {
    let dismissed = 0;
    const controls = buttons(loaded.exports.HubModal({ title: 'Settings', appearance: 'chat', dismissControl: 'back', icon, onClose: () => dismissed++, children: null }));
    assert.equal(controls.length, 1);
    assert.equal(controls[0].props.accessibilityLabel, 'Quay lại');
    controls[0].props.onPress();
    assert.equal(dismissed, 1);
  }
});
test('other popups retain their default close button', () => {
  const controls = buttons(loaded.exports.HubModal({ title: 'Other', onClose() {}, children: null }));
  assert.equal(controls.length, 1);
  assert.equal(controls[0].props.accessibilityLabel, 'Đóng');
});

test('outside press closes the popup while dialog content has no dismiss handler', () => {
  let closed = 0;
  const tree = loaded.exports.HubModal({ title: 'Popup', onClose: () => closed++, children: 'Content' });
  function nodes(node) { return React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(nodes)] : []; }
  const all = nodes(tree);
  const backdrop = all.find(node => node.type === 'Pressable' && node.props.accessible === false);
  const dialog = all.find(node => node.props.role === 'dialog');
  assert.ok(backdrop);
  assert.equal(dialog.props.onPress, undefined);
  assert.equal(closed, 0);
  backdrop.props.onPress();
  assert.equal(closed, 1);
});
