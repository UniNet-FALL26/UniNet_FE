const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');

function load(sizes) {
  let state = 0;
  const imports = {
    react: { useState: () => [sizes[state++], () => {}] },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'expo-image': { Image: 'Image' },
    'react-native': { View: 'View', StyleSheet: { absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, create: value => value } },
    '@/utils/profile-image-crop': { splitProfileImageUrl: () => ({ source: 'https://fixture.test/avatar.png', crop: { x: 0, y: 0, zoom: 2 } }) },
  };
  const code = ts.transpileModule(fs.readFileSync('src/components/profile/ProfileFramedImage.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => imports[name], module, module.exports);
  return module.exports.ProfileFramedImage({ uri: 'fixture', accessibilityLabel: 'Avatar' }).props.children;
}

test('avatar fills its frame before natural dimensions are known', () => {
  const image = load([{ width: 90, height: 90 }, { width: 0, height: 0 }]);
  assert.notEqual(image.props.style.width, 0);
  assert.notEqual(image.props.style.height, 0);
  assert.equal(image.props.contentFit, 'cover');
  assert.equal(image.props.loading, 'eager');
});

test('loaded avatar retains the saved zoom and centered crop', () => {
  const image = load([{ width: 90, height: 90 }, { width: 180, height: 90 }]);
  assert.deepEqual(image.props.style, { position: 'absolute', width: 360, height: 180, left: -135, top: -45 });
});
