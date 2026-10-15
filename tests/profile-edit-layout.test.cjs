const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

function mountField(nativeDOM = false) {
  let cursor = 0, updates = 0;
  const slots = [];
  const Text = () => null;
  class NativeElement { parentElement = {}; }
  const react = { ...React, useContext: () => ({ disabled: false, onField() {} }),
    useRef(value) { const index = cursor++; return slots[index] ||= { current: value }; },
    useState(value) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value, set: next => { const value = typeof next === 'function' ? next(slots[index].value) : next; if (!Object.is(value, slots[index].value)) { slots[index].value = value; updates++; } } };
      return [slots[index].value, slots[index].set];
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((dep, i) => !Object.is(dep, slots[index].deps[i]))) slots[index] = { callback, deps };
      return slots[index].callback;
    },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/profile/ProfileEditContext.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, ...(nativeDOM ? { Element: NativeElement } : {}), require: name => name === 'react' ? react : name === 'react/jsx-runtime' ? require(name)
    : name === 'react-native' ? { Platform: { OS: 'android' }, Text, View: () => null, Pressable: () => null, StyleSheet: { create: value => value } }
    : name === 'expo-symbols' ? { SymbolView: () => null } : { profileEditorSections: [] } });
  return {
    render() { cursor = 0; return exports.EditField({ field: 'bio', label: 'Bio', color: 'white', overlay: true, children: React.createElement(Text, null, 'Introduction') }).props.children[0].props; },
    get updates() { return updates; },
    nativeNode: new NativeElement(),
  };
}

test('repeated native text/layout events do not schedule identical pencil updates', () => {
  const field = mountField();
  const line = { nativeEvent: { lines: [{ x: 0, y: 0, width: 100, height: 24 }] } };
  field.render().onTextLayout(line);
  assert.equal(field.updates, 1);
  for (let i = 0; i < 10; i++) {
    const props = field.render();
    props.onTextLayout(line);
    props.onLayout({ nativeEvent: { layout: { x: 0, y: 0 } } });
  }
  assert.equal(field.updates, 1, 'Identical layout events must bail out instead of rendering again');
  field.render().onLayout({ nativeEvent: { layout: { x: 0, y: 12 } } });
  assert.equal(field.updates, 2, 'A changed text offset still updates the pencil');
});

test('native DOM-compatible Text nodes do not access browser document APIs', () => {
  const field = mountField(true); const props = field.render();
  props.ref.current = field.nativeNode;
  props.onTextLayout({ nativeEvent: { lines: [{ x: 0, y: 0, width: 100, height: 24 }] } });
  assert.doesNotThrow(() => props.onLayout({ nativeEvent: { layout: { x: 0, y: 12 } } }));
  assert.equal(field.updates, 2);
});

test('layout callback identities stay stable after pencil state changes', () => {
  const field = mountField(); const first = field.render();
  first.onTextLayout({ nativeEvent: { lines: [{ x: 0, y: 0, width: 100, height: 24 }] } });
  const next = field.render();
  assert.equal(next.onTextLayout, first.onTextLayout);
  assert.equal(next.onLayout, first.onLayout);
});
