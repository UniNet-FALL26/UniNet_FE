const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function render(disabled = false, profileOverrides = {}, failedCover = null) {
  const exports = {}, selected = [];
  const jsx = (type, props) => ({ type, props });
  const native = { StyleSheet: { create: x => x, absoluteFill: {} }, Text: 'Text', View: 'View', Pressable: 'Pressable' };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/profile/StudentProfileStarter.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react') { let calls = 0; return { useState: initial => [++calls === 2 ? failedCover : initial, () => {}] }; }
    if (name === 'react-native') return native;
    if (name === 'expo-image') return { Image: 'Image' };
    if (name === 'expo-symbols') return { SymbolView: 'SymbolView' };
    if (name.endsWith('profile-media')) return { profileMedia: uri => ({ uri }) };
    if (name.includes('colors')) return { colors: {} };
    if (name.endsWith('.png')) return name;
    return { Button: 'Button' };
  } });
  const tree = exports.StudentProfileStarter({ profile: { fullName: 'Mai An', nickname: 'mai', avatarUrl: 'https://example.org/avatar.png', coverUrl: 'https://example.org/cover.png', ...profileOverrides }, width: 320, onChooseTemplate: () => selected.push('templates'), onChangePhoto: target => selected.push(target), changingPhoto: disabled });
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
  assert.ok(render(true).nodes.filter(n => ['Đổi ảnh bìa', 'Đổi ảnh đại diện'].includes(n.props?.accessibilityLabel)).every(n => n.props.disabled));
});

test('missing and failed user covers show the bundled campus artwork', () => {
  for (const view of [render(false, { coverUrl: null }), render(false, {}, 'https://example.org/cover.png')]) {
    const cover = view.nodes.find(n => n.props?.accessibilityLabel === 'Ảnh bìa mặc định UniNet');
    assert.ok(cover);
    assert.match(cover.props.source, /student-starter-cover\.png$/);
  }
  assert.equal(render().nodes.some(n => n.props?.accessibilityLabel === 'Ảnh bìa mặc định UniNet'), false);
});

test('benefit cards are static; only the bottom discovery card opens templates', () => {
  const { nodes, selected } = render();
  assert.equal(nodes.some(n => n.type === 'Pressable' && n.props.accessibilityLabel === 'Xem mẫu hồ sơ'), false);
  for (const id of ['starter-strengths', 'starter-projects']) {
    const card = nodes.find(n => n.props?.testID === id);
    assert.ok(card, id);
    assert.equal(card.type, 'View');
    assert.equal(card.props.onPress, undefined);
    assert.equal(card.props.accessibilityRole, undefined);
  }
  const discovery = nodes.find(n => n.type === 'Pressable' && n.props.accessibilityLabel === 'Khám phá mẫu hồ sơ chuyên nghiệp');
  assert.ok(discovery); discovery.props.onPress();
  assert.deepEqual(selected, ['templates']);
  assert.equal(nodes.some(n => n.props?.children === 'Chưa cập nhật địa điểm'), false);
});

test('introduction contains the reference benefits and expanded descriptions', () => {
  const { nodes } = render();
  const text = nodes.filter(n => n.type === 'Text').map(n => n.props.children).filter(t => typeof t === 'string').join(' ');
  for (const content of ['Được nhìn thấy', 'Bởi nhà tuyển dụng, đối tác và cộng đồng', 'Tạo dấu ấn cá nhân', 'Thể hiện kỹ năng, kinh nghiệm và phong cách của riêng bạn', 'Mở ra cơ hội mới', 'Kết nối với những dự án, cơ hội phù hợp', 'Tạo hồ sơ nổi bật với các mẫu chuyên nghiệp.', 'Biến hành trình học tập và làm việc thành câu chuyện truyền cảm hứng.']) assert.ok(text.includes(content), content);
  for (const asset of ['student-starter-intro.png', 'student-starter-strengths.png', 'student-starter-projects.png']) assert.ok(nodes.some(n => n.type === 'Image' && n.props.source?.endsWith?.(asset)), asset);
});
