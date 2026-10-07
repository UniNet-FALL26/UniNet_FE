const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function applyPlugin(contents) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../plugins/with-android-dev-support.js'), 'utf8');
  vm.runInNewContext(source, {
    module,
    require(name) {
      assert.equal(name, 'expo/config-plugins');
      return { withMainApplication: (config, action) => action(config) };
    },
  });
  return module.exports({ modResults: { language: 'kt', contents } }).modResults.contents;
}

const original = `ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages
    )`;

test('Android host uses app debug flag so debug builds load Metro and release builds load assets', () => {
  const patched = applyPlugin(original);
  assert.match(patched, /useDevSupport = BuildConfig\.DEBUG,/);
  assert.match(patched, /context = applicationContext/);
});

test('Android dev support fix survives repeated prebuilds without duplicate arguments', () => {
  const once = applyPlugin(original);
  assert.equal(applyPlugin(once), once);
});

test('unsupported native template fails explicitly instead of silently retaining the crash', () => {
  assert.throws(() => applyPlugin('class MainApplication {}'), /ExpoReactHostFactory/);
});
