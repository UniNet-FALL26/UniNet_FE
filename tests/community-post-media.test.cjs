const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const output = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/community/CommunityPostMedia.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports: output, require: name => name === 'react-native'
  ? { Image: 'Image', Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: value => value, absoluteFill: { position: 'absolute' } } } : require(name) });
function find(node, type) {
  if (!node || typeof node !== 'object') return [];
  return [...(node.type === type ? [node] : []), ...React.Children.toArray(node.props.children).flatMap(child => find(child, type))];
}
test('zero media renders nothing', () => assert.equal(output.CommunityPostMedia({ urls: [], onOpen() {} }), null));
test('single, pair and galleries preserve full images over matching blurred backgrounds', () => {
  for (const count of [1, 2, 3, 4, 7]) {
    const urls = Array.from({ length: count }, (_, index) => `image-${index}`), opened = [];
    const tree = output.CommunityPostMedia({ urls, onOpen: index => opened.push(index) });
    const tiles = find(tree, 'Pressable');
    assert.equal(tiles.length, Math.min(4, count));
    tiles.forEach((tile, index) => {
      tile.props.onPress();
      const images = find(tile, 'Image');
      assert.equal(images[0].props.source.uri, urls[index]);
      assert.equal(images[1].props.source.uri, urls[index]);
      assert.equal(images[0].props.resizeMode, 'cover');
      assert.equal(images[0].props.blurRadius, 24);
      assert.equal(images[1].props.resizeMode, 'contain');
    });
    assert.deepEqual(opened, Array.from({ length: Math.min(4, count) }, (_, index) => index));
    const labels = find(tree, 'Text');
    assert.equal(labels.length, count > 4 ? 1 : 0);
    if (count > 4) assert.equal(React.Children.toArray(labels[0].props.children).join(''), '+' + (count - 4));
  }
});
