const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');

function mount(os, enabled = true) {
  const listeners = new Map(), refs = [], states = [], effects = [], calls = [];
  let refIndex = 0, stateIndex = 0;
  const input = {};
  const native = {
    ...Object.fromEntries(['View', 'ScrollView', 'KeyboardAvoidingView'].map(name => [name, name])),
    Platform: { OS: os }, TextInput: { State: { currentlyFocusedInput: () => input } },
    Keyboard: { addListener(name, fn) { listeners.set(name, fn); return { remove: () => listeners.delete(name) }; } },
  };
  const imports = {
    react: {
      useRef(value) { const i = refIndex++; return refs[i] ??= { current: value }; },
      useState(value) { const i = stateIndex++; if (!(i in states)) states[i] = value; return [states[i], next => { states[i] = next; }]; },
      useEffect(fn) { effects.push(fn); },
    },
    'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': native,
  };
  const source = fs.readFileSync('src/components/opportunities/OpportunityApplicationScroll.tsx', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => imports[name], module, module.exports);
  const render = () => { refIndex = stateIndex = 0; return module.exports.OpportunityApplicationScroll({ enabled, children: React.createElement('input') }); };
  let tree = render();
  refs[0].current = { measureInWindow: fn => fn(0, 100) };
  refs[1].current = {
    scrollTo: args => calls.push(['restore', args]),
    scrollToEnd: args => calls.push(['end', args]),
    scrollResponderScrollNativeHandleToKeyboard: (...args) => calls.push(['reveal', ...args]),
  };
  const cleanup = effects[0]();
  return { tree, render, calls, listeners, cleanup, input };
}

for (const os of ['ios', 'android']) test(`${os}: reveals focused input, restores scroll on dismiss, cleans listeners`, () => {
  const app = mount(os);
  app.tree.props.onLayout();
  const avoider = app.render().props.children;
  assert.equal(avoider.props.behavior, os === 'ios' ? 'padding' : 'height');
  assert.equal(avoider.props.keyboardVerticalOffset, 100);
  const scroll = avoider.props.children;
  scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 450 } } });
  app.listeners.get('keyboardWillShow')();
  app.listeners.get('keyboardDidShow')();
  assert.deepEqual(app.calls[0], ['reveal', app.input, 16, true]);
  scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 650 } } });
  app.listeners.get('keyboardDidHide')();
  assert.deepEqual(app.calls[1], ['restore', { y: 450, animated: false }]);
  app.cleanup();
  assert.equal(app.listeners.size, 0);
});

test('wide screens do not subscribe to keyboard events', () => {
  const app = mount('android', false);
  assert.equal(app.listeners.size, 0);
  assert.equal(app.tree.props.children.props.enabled, false);
});

test('mobile web shrinks to visible viewport and restores size and scroll after dismissal', () => {
  const events = new Map();
  const viewport = { height: 800, offsetTop: 0, addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) };
  global.window = { visualViewport: viewport };
  try {
    const app = mount('web');
    app.tree.props.children.props.children.props.onScroll({ nativeEvent: { contentOffset: { y: 450 } } });
    viewport.height = 480;
    events.get('resize')();
    let avoider = app.render().props.children;
    assert.equal(avoider.props.style.maxHeight, 380);
    avoider.props.children.props.onLayout({});
    assert.deepEqual(app.calls[0], ['end', { animated: false }]);
    viewport.height = 800;
    events.get('resize')();
    avoider = app.render().props.children;
    assert.equal(avoider.props.style.maxHeight, undefined);
    assert.deepEqual(app.calls[1], ['restore', { y: 450, animated: false }]);
    app.cleanup();
    assert.equal(events.size, 0);
  } finally { delete global.window; }
});
