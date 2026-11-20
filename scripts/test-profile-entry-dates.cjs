const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const code = ts.transpileModule(fs.readFileSync('src/utils/profile-editor.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
new Function('module', 'exports', code)(loaded, loaded.exports);
const { addProfileEntry, profileEditorSections, profileFormValues, updateProfileEducation } = loaded.exports;
const empty = { education: [], experience: [], certificates: [], articles: [], activities: [], skills: [] };
const add = (section, values) => addProfileEntry(empty, section, { title: 'Example', issuer: 'University', url: 'https://example.com', ...values }, []);

test('education inputs include helpful examples', () => {
  const fields = profileEditorSections.find(section => section.id === 'education').fields;
  for (const field of fields) assert.ok(field.placeholder?.trim(), `Missing example for ${field.key}`);
  assert.ok(!fields.some(field => field.key === 'period' || field.key === 'gpa'));
});

test('editing education pre-fills values and updates only the selected entry without appending', () => {
  const first = { title: 'First', startDate: '2020-09-01', endDate: '2024-06-30', gpa: '3.5/4', period: 'Legacy period' };
  const second = { title: 'Second' };
  const content = { ...empty, education: [first, second] };
  const values = profileFormValues(content, 'education', 0);
  assert.equal(values.title, 'First');
  assert.equal(values.startDate, first.startDate);
  assert.equal(values.endDate, first.endDate);
  const next = updateProfileEducation(content, 0, { ...values, title: 'Updated', endDate: '01/07/2024' });
  assert.equal(next.education.length, 2);
  assert.equal(next.education[0].title, 'Updated');
  assert.equal(next.education[0].endDate, '01/07/2024');
  assert.equal(next.education[0].gpa, first.gpa);
  assert.strictEqual(next.education[1], second);
  assert.strictEqual(content.education[0], first);
  assert.throws(() => updateProfileEducation(content, 0, { ...values, endDate: '01/01/2019' }), /./);
  assert.throws(() => updateProfileEducation(content, 2, values), /./);
  assert.doesNotThrow(() => updateProfileEducation({ ...empty, education: Array(50).fill(first) }, 49, values));
});

for (const section of ['education', 'experience']) {
  test(`${section}: rejects invalid calendar dates and ambiguous input`, () => {
    for (const startDate of ['31/04/2024', '29/02/2023', '29/02/1900', '00/12/2024', '12/13/2024', '2024-02-30', 'tomorrow', '2024', '01/01/0000']) {
      assert.throws(() => add(section, { startDate }), /./, startDate);
    }
  });
  test(`${section}: accepts leap dates and ISO dates without changing entered values`, () => {
    const values = { startDate: '29/02/2000', endDate: '2024-02-29' };
    const entry = add(section, values)[section][0];
    assert.equal(entry.startDate, values.startDate);
    assert.equal(entry.endDate, values.endDate);
  });
  test(`${section}: prevents reversed ranges and permits equal dates or an ongoing entry`, () => {
    assert.throws(() => add(section, { startDate: '01/03/2024', endDate: '29/02/2024' }), /./);
    assert.doesNotThrow(() => add(section, { startDate: '01/03/2024', endDate: '2024-03-01' }));
    assert.doesNotThrow(() => add(section, { startDate: '01/03/2024', endDate: '' }));
    assert.doesNotThrow(() => add(section, {}));
    assert.equal(empty[section].length, 0);
  });
}

test('other date fields including certificate issue dates are checked on confirmation too', () => {
  for (const section of ['articles', 'activities']) {
    assert.throws(() => add(section, { date: '31/02/2024' }), /./);
    assert.doesNotThrow(() => add(section, { date: '29/02/2024' }));
    assert.doesNotThrow(() => add(section, { date: '' }));
  }
  const issueDate = profileEditorSections.find(section => section.id === 'certificates').fields.find(field => field.key === 'year');
  assert.equal(issueDate.kind, 'date');
  for (const year of ['abcd', '2024', '31/04/2024', '29/02/2023', '2024.5']) assert.throws(() => add('certificates', { year }), /./);
  assert.equal(add('certificates', { year: '29/02/2024' }).certificates[0].year, '29/02/2024');
  assert.doesNotThrow(() => add('certificates', { year: '2024-02-29' }));
  assert.doesNotThrow(() => add('certificates', {}));
});

function loadComponent(file, imports) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => imports[name], module, module.exports);
  return module.exports;
}
function nodes(node) { return React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(nodes)] : []; }
const native = { ...Object.fromEntries(['KeyboardAvoidingView', 'Modal', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View'].map(name => [name, name])), StyleSheet: { create: value => value }, Platform: { OS: 'ios' } };

test('education confirmation blocks invalid dates and accepts a date chosen using the shared project calendar', () => {
  const states = [], added = [];
  let cursor = 0;
  const { ProfileEntryForm } = loadComponent('src/components/profile/ProfileEntryForm.tsx', {
    react: { useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; } },
    'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': native,
    'expo-image': { Image: 'Image' }, 'expo-symbols': { SymbolView: 'SymbolView' },
    '@/components/ui/ToastHost': { ToastHost: 'ToastHost' }, '@/components/ui/Button': { Button: 'Button' },
    '@/components/ui/CalendarDateInput': { CalendarDateInput: 'CalendarDateInput' },
    '@/components/projects/hub/ProjectTimelineDateModal': { ProjectTimelineDateModal: 'ProjectTimelineDateModal' },
    './ProfileTextInput': { ProfileTextInput: 'ProfileTextInput' }, '@/constants/colors': { colors: {} },
    '@/utils/profile-editor': loaded.exports, './profile-media': {},
  });
  const render = () => { cursor = 0; return nodes(ProfileEntryForm({ section: profileEditorSections.find(s => s.id === 'education'), data: { portfolio: empty, skillCatalog: [] }, onAdd: value => added.push(value), onClose() {} })); };
  let tree = render();
  tree.find(n => n.type === 'ProfileTextInput' && n.props.label.includes('*')).props.onChangeText('Computer Science');
  const dates = () => tree.filter(n => n.type === 'CalendarDateInput');
  dates()[0].props.onChangeText('31/02/2024');
  tree = render();
  tree.find(n => n.type === 'Button' && n.props.title !== 'Hủy').props.onPress();
  assert.equal(added.length, 0);
  tree = render();
  assert.ok(tree.some(n => n.props.accessibilityRole === 'alert'));
  dates()[0].props.onChangeText('29/02/2024');
  dates()[1].props.onOpenCalendar();
  tree = render();
  const calendar = tree.find(n => n.type === 'ProjectTimelineDateModal');
  assert.equal(calendar.props.min, '2024-02-29');
  calendar.props.onConfirm('2024-03-01');
  tree = render();
  assert.equal(dates()[1].props.value, '01/03/2024');
  tree.find(n => n.type === 'Button' && n.props.title !== 'Hủy').props.onPress();
  assert.equal(added[0].education[0].endDate, '01/03/2024');
});

test('shared date input has a calendar button on the right and dismisses the keyboard before opening', () => {
  const calls = [];
  const { CalendarDateInput } = loadComponent('src/components/ui/CalendarDateInput.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': { ...native, Keyboard: { dismiss: () => calls.push('dismiss') } },
    'expo-symbols': { SymbolView: 'SymbolView' }, '@/constants/colors': { colors: {} },
  });
  for (const readOnly of [false, true]) {
    const tree = CalendarDateInput({ label: 'Date', value: '', readOnly, onOpenCalendar: () => calls.push('open') });
    const control = tree.props.children[1];
    const right = control.props.children[1];
    if (!readOnly) right.props.onPress(); else control.props.onPress();
    assert.deepEqual(calls.splice(0), ['dismiss', 'open']);
    assert.equal(right.props.children.type, 'SymbolView');
  }
});
