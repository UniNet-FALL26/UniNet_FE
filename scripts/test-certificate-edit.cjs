const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
function load(file, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => imports[name] || new Proxy({}, { get: (_, key) => key === 'ui' ? {} : key }), module, module.exports);
  return module.exports;
}
const editor = load('src/utils/profile-editor.ts');
const empty = { skills: [], education: [], certificates: [] };
const native = { ...Object.fromEntries(['KeyboardAvoidingView', 'Modal', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View'].map(name => [name, name])), StyleSheet: { create: value => value }, Platform: { OS: 'ios' } };
function nodes(node) { return React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(nodes)] : []; }
function hooks() {
  const states = [], refs = [], effects = [];
  let state = 0, ref = 0;
  return {
    reset() { state = ref = 0; }, effects,
    react: { useState(initial) { const i = state++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; }, useRef(initial) { return refs[ref++] ??= { current: initial }; }, useEffect(fn) { effects.push(fn); } },
  };
}

test('certificate edit preserves item order and validates selected image and issue date', () => {
  const original = { title: 'First', issuer: 'Issuer', year: '01/01/2024', logoUrl: 'https://example.org/old.png' };
  const other = { title: 'Other', issuer: 'Other' };
  const content = { ...empty, certificates: [original, other] };
  const values = editor.profileFormValues(content, 'certificates', 0);
  assert.equal(values.logoUrl, original.logoUrl);
  const next = editor.updateProfileEntry(content, 'certificates', 0, { ...values, title: 'Updated', logoUrl: 'https://example.org/new.png' });
  assert.equal(next.certificates.length, 2);
  assert.strictEqual(next.certificates[1], other);
  assert.equal(next.certificates[0].logoUrl, 'https://example.org/new.png');
  assert.equal(original.title, 'First');
  assert.throws(() => editor.updateProfileEntry(content, 'certificates', 0, { ...values, year: '31/02/2024' }), /./);
  assert.throws(() => editor.updateProfileEntry(content, 'certificates', 0, { ...values, logoUrl: 'javascript:alert(1)' }), /./);
});

test('certificate edit popup pre-fills fields and image and waits for image upload before confirming', () => {
  const h = hooks(), added = [], closed = [];
  const { ProfileEntryForm } = load('src/components/profile/ProfileEntryForm.tsx', {
    react: h.react, 'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': native,
    '@/utils/profile-editor': editor, '@/constants/colors': { colors: {} },
    './CertificateImageInput': { CertificateImageInput: 'CertificateImageInput' }, './ProfileTextInput': { ProfileTextInput: 'ProfileTextInput' },
    '@/components/ui/Button': { Button: 'Button' },
  });
  const content = { ...empty, certificates: [{ title: 'Certificate', issuer: 'Issuer', year: '01/01/2024', logoUrl: 'https://example.org/logo.png' }] };
  const render = () => { h.reset(); return nodes(ProfileEntryForm({ section: editor.profileEditorSections.find(s => s.id === 'certificates'), data: { portfolio: content, skillCatalog: [] }, entryIndex: 0, onAdd: value => added.push(value), onClose: () => closed.push(true) })); };
  let tree = render();
  assert.equal(tree.find(n => n.type === 'ProfileTextInput' && n.props.label.includes('*')).props.value, 'Certificate');
  const image = tree.find(n => n.type === 'CertificateImageInput');
  assert.equal(image.props.value, content.certificates[0].logoUrl);
  image.props.onBusy(true);
  tree = render();
  const confirm = () => tree.filter(n => n.type === 'Button').at(-1);
  assert.equal(confirm().props.disabled, true);
  confirm().props.onPress();
  tree[0].props.onRequestClose();
  assert.equal(added.length + closed.length, 0);
  image.props.onChange('https://example.org/new.png');
  image.props.onBusy(false);
  tree = render();
  confirm().props.onPress();
  assert.equal(added[0].certificates.length, 1);
  assert.equal(added[0].certificates[0].logoUrl, 'https://example.org/new.png');
});

const tick = () => new Promise(resolve => setImmediate(resolve));
function mountImage(picker, uploader) {
  const h = hooks(), changes = [], busy = [];
  const { CertificateImageInput } = load('src/components/profile/CertificateImageInput.tsx', {
    react: h.react, 'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': native,
    'expo-image': { Image: 'Image' }, 'expo-symbols': { SymbolView: 'SymbolView' },
    '@/components/ui/Button': { Button: 'Button' }, '@/constants/colors': { colors: {} },
    '@/utils/profile-image-picker': { pickProfileImage: picker, uploadProfileImage: uploader },
    './profile-media': { profileMedia: uri => ({ uri }) },
  });
  const render = () => { h.reset(); return nodes(CertificateImageInput({ value: 'https://example.org/old.png', onChange: value => changes.push(value), onBusy: value => busy.push(value) })); };
  const tree = render(), cleanup = h.effects[0]();
  return { render, changes, busy, cleanup, choose: () => tree.find(n => n.type === 'Button').props.onPress() };
}
test('device image selection uploads an image and cancellation preserves the original', async () => {
  const asset = { uri: 'file:///chosen.png' };
  const app = mountImage(async () => asset, async (picked, signal) => { assert.equal(picked, asset); assert.equal(signal.aborted, false); return 'https://example.org/new.png'; });
  app.choose(); await tick();
  assert.deepEqual(app.changes, ['https://example.org/new.png']);
  assert.deepEqual(app.busy, [true, false]);
  const canceled = mountImage(async () => null, () => assert.fail('canceled selection must not upload'));
  canceled.choose(); await tick();
  assert.deepEqual(canceled.changes, []);
  assert.deepEqual(canceled.busy, [true, false]);
});
test('upload failure retains the original and an unmounted form aborts pending upload', async () => {
  const failed = mountImage(async () => ({ uri: 'file:///chosen.png' }), async () => { throw new Error('Upload failed'); });
  failed.choose(); await tick();
  assert.deepEqual(failed.changes, []);
  assert.ok(failed.render().some(n => n.props.accessibilityRole === 'alert'));
  let finish, signal;
  const pending = mountImage(async () => ({ uri: 'file:///chosen.png' }), (_, current) => { signal = current; return new Promise(resolve => { finish = resolve; }); });
  pending.choose(); await tick(); pending.cleanup();
  assert.equal(signal.aborted, true);
  finish('https://example.org/new.png'); await tick();
  assert.deepEqual(pending.changes, []);
});

for (const [file, name] of [
  ['developer-modern/PortfolioSections.tsx', 'CertificateSection'],
  ['developer-showcase/ShowcaseSections.tsx', 'ShowcaseCertificates'],
  ['developer-landscape/LandscapeExtras.tsx', 'LandscapeCertificates'],
]) test(`${name}: certificate has a pencil and no camera control`, () => {
  const Section = load('src/components/profile/templates/' + file, {
    'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': native,
    '@/components/profile/ProfileEditContext': { useProfileEditing: () => ({}), EditCertificateEntry: 'EditCertificateEntry', EditPhoto: 'EditPhoto' },
    '@/components/profile/profile-media': { profileMedia: uri => uri ? { uri } : null, isSampleLink: () => true },
    './LandscapeSections': { tileWidth: width => width, LandscapeHeading: 'LandscapeHeading', sectionStyles: {} },
  })[name];
  const tree = nodes(Section({ portfolio: { certificates: [{ title: 'Certificate', issuer: 'Issuer' }] }, theme: {}, compact: true, width: 390 }));
  assert.equal(tree.filter(n => n.type === 'EditCertificateEntry').length, 1);
  assert.equal(tree.filter(n => n.type === 'EditPhoto').length, 0);
});
