const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
function load(file, imports) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => imports[name], module, module.exports);
  return module.exports;
}
function nodes(node) { return React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(nodes)] : []; }
function setup() {
  let editing = null;
  const controls = load('src/components/profile/ProfileEditContext.tsx', {
    react: { ...React, useContext: () => editing }, 'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { StyleSheet: { create: value => value }, View: 'View', Text: 'Text', Pressable: 'Pressable' },
    'expo-symbols': { SymbolView: 'SymbolView' },
    '@/utils/profile-editor': load('src/utils/profile-editor.ts', {}),
  });
  return { ...controls, setEditing: value => { editing = value; } };
}

test('journey has one icon-only add button that opens education', () => {
  const { SectionAdd, setEditing } = setup();
  const opened = [];
  setEditing({ disabled: false, onAdd: section => opened.push(section.id) });
  const tree = nodes(SectionAdd({ title: 'Hành trình phát triển', theme: {} }));
  const buttons = tree.filter(node => node.type === 'Pressable');
  assert.equal(buttons.length, 1);
  assert.equal(tree.filter(node => node.type === 'Text').length, 0);
  buttons[0].props.onPress();
  assert.deepEqual(opened, ['education']);
});

test('education pencil appears on the right only in the editor and opens the original entry', () => {
  const { EditEducationEntry, setEditing } = setup();
  const child = React.createElement('Text', {}, 'Dates');
  assert.equal(nodes(EditEducationEntry({ index: 0, color: '#123', children: child })).filter(n => n.type === 'Pressable').length, 0);
  const selected = [];
  const editing = { data: { portfolio: { education: [{ title: 'One' }, { title: 'Two' }] } }, disabled: false, onEditEducation: index => selected.push(index) };
  setEditing(editing);
  const tree = EditEducationEntry({ index: 1, color: '#123', children: child });
  assert.equal(tree.props.children[0].props.children, child);
  const pencil = tree.props.children[1];
  assert.equal(pencil.type, 'Pressable');
  pencil.props.onPress();
  assert.deepEqual(selected, [1]);
  assert.equal(nodes(EditEducationEntry({ index: -1, color: '#123', children: child })).filter(n => n.type === 'Pressable').length, 0);
  setEditing({ ...editing, disabled: true });
  assert.equal(EditEducationEntry({ index: 0, color: '#123', children: child }).props.children[1].props.disabled, true);
});
