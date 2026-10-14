const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the real editor effect with RN's window alias and browser event APIs.
const source = fs.readFileSync('src/app/profile/editor.tsx', 'utf8');
const anchor = source.indexOf('const preventReload');
assert.ok(anchor >= 0);
const start = source.lastIndexOf('  useEffect(', anchor);
const endMarker = '  }, [dirty, saving]);';
const end = source.indexOf(endMarker, anchor) + endMarker.length;
const code = ts.transpileModule(source.slice(start, end), {}).outputText;
function runEffect(OS, window, dirty, saving) {
  let effect;
  vm.runInNewContext(code, { Platform: { OS }, window, dirty, saving, useEffect: callback => { effect = callback; } });
  return effect();
}

test('Android/iOS dirty and saving states tolerate a window without browser event APIs', () => {
  for (const platform of ['android', 'ios']) {
    for (const [dirty, saving] of [[true, false], [false, true], [true, true]])
      assert.equal(runEffect(platform, {}, dirty, saving), undefined);
  }
});

test('web dirty/saving registers unload protection and removes the same listener', () => {
  for (const [dirty, saving] of [[true, false], [false, true]]) {
    let registered, removed;
    const cleanup = runEffect('web', {
      addEventListener: (...args) => { registered = args; },
      removeEventListener: (...args) => { removed = args; },
    }, dirty, saving);
    assert.equal(registered[0], 'beforeunload');
    let prevented = false;
    const event = { preventDefault: () => { prevented = true; } };
    registered[1](event);
    assert.equal(prevented, true); assert.equal(event.returnValue, '');
    cleanup(); assert.deepEqual(removed, registered);
  }
});

test('a clean web draft does not register unload protection', () => {
  assert.equal(runEffect('web', {}, false, false), undefined);
});
