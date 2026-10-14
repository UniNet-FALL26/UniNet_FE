const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function render(disabled = false) {
  const exports = {}, selected = [];
  const jsx = (type, props) => ({ type, props });
  const native = { StyleSheet: { create: x => x, absoluteFill: {} }, Text: 'Text', View: 'View', Pressable: 'Pressable' };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/profile/StudentProfileStarter.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react') return { useState: initial => [initial, () => {}] };
    if (name === 'react-native') return native;
    if (name === 'expo-image') return { Image: 'Image' };
    if (name === 'expo-symbols') return { SymbolView: 'SymbolView' };
    if (name.endsWith('profile-media')) return { profileMedia: uri => ({ uri }) };
    if (name.includes('colors')) return { colors: {} };
    return { Button: 'Button' };
  } });
  const tree = exports.StudentProfileStarter({ profile: { fullName: 'Mai An', nickname: 'mai', avatarUrl: 'https://example.org/avatar.png', coverUrl: 'https://example.org/cover.png' }, width: 320, onChooseTemplate() {}, onChangePhoto: target => selected.push(target), changingPhoto: disabled });
  const nodes = [];
  function visit(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(visit); nodes.push(node); visit(node.props?.children); }
  visit(tree); return { nodes, selected };
}

test('cover preserves the full image over a decorative blurred copy and removes student badge', () => {
  const { nodes } = render();
  const cover = nodes.find(n => n.props?.accessibilityLabel === 'Ảnh bìa của bạn');
  assert.equal(cover.props.contentFit, 'contain');
  assert.ok(nodes.some(n => n.type === 'Image' && n.props.blurRadius > 0 && n.props.contentFit === 'cover' && n.props.accessible === false));
  assert.equal(nodes.some(n => n.props?.children === 'Sinh viên UniNet'), false);
});

test('camera buttons select the correct image and are disabled during an update', () => {
  const { nodes, selected } = render();
  for (const label of ['Đổi ảnh bìa', 'Đổi ảnh đại diện']) {
    const button = nodes.find(n => n.type === 'Pressable' && n.props.accessibilityLabel === label);
    assert.equal(button.props.accessibilityRole, 'button'); button.props.onPress();
    assert.ok(button.props.style.some(style => style?.position === 'absolute' && typeof style.bottom === 'number' && typeof style.right === 'number'));
  }
  assert.deepEqual(selected, ['coverUrl', 'avatarUrl']);
  assert.ok(render(true).nodes.filter(n => n.type === 'Pressable').every(n => n.props.disabled));
});
