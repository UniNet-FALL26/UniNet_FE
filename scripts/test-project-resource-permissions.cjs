const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');

function load(file, overrides = {}) {
  const imports = {
    react: { useState: value => [typeof value === 'function' ? value() : value, () => {}], useRef: value => ({ current: value }) },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { Platform: { OS: 'web' }, Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: value => value } },
    ...overrides,
  };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code + '\nif (typeof ResourcesPanel !== "undefined") module.exports.ResourcesPanel = ResourcesPanel;')(name => imports[name] || new Proxy({}, { get: (_, key) => key }), module, module.exports);
  return module.exports;
}
function find(node, type) {
  if (!React.isValidElement(node)) return [];
  return [...(node.type === type ? [node] : []), ...React.Children.toArray(node.props.children).flatMap(child => find(child, type))];
}
const project = { id: 'project', details: { documents: [{ url: 'https://example.test/file.pdf', name: 'File.pdf', type: 'document' }], media: [] } };
const { ProjectDocumentsPanel } = load('src/components/projects/hub/ProjectDocumentsPanel.tsx');
const { ResourcesPanel } = load('src/components/projects/hub/ProjectHubDetailScreen.tsx');
for (const [isOwner, isMember] of [[true, true], [false, true], [false, false]]) {
  test(`upload controls match project participation: owner=${isOwner}, member=${isMember}`, () => {
    let added = 0;
    const props = { project: { ...project, isOwner, isMember }, busy: false, error: '', onAdd: () => { added++; }, onUpdate: async () => {} };
    const tree = ProjectDocumentsPanel(props);
    const upload = find(tree, 'HubAction').find(node => node.props.icon === 'upload');
    assert.equal(!!upload, isOwner || isMember);
    assert.equal(find(tree, 'ProjectDocumentMenu')[0].props.owner, isOwner);
    const media = ResourcesPanel({ ...props, kind: 'media' });
    const addMedia = find(media, 'HubAction').find(node => node.props.icon === 'plus');
    assert.equal(!!addMedia, isOwner || isMember);
    if (upload) { upload.props.onPress(); addMedia.props.onPress(); assert.equal(added, 2); }
  });
}
test('resource additions use a dedicated POST with one file instead of replacing project details', async () => {
  const calls = [];
  const { projectHubService } = load('src/services/project-hub.service.ts', {
    '@/constants/config': { API_URL: 'https://example.test/api' },
    '@/services/api': { apiRequest: async (url, options) => { calls.push({ url, options }); return project; } },
  });
  for (const kind of ['documents', 'media']) {
    await projectHubService.addResource(project.id, kind, project.details.documents[0]);
    const call = calls.at(-1);
    assert.equal(call.url, `/project-hub/project/resources/${kind}`);
    assert.equal(call.options.method, 'POST');
    assert.deepEqual(JSON.parse(call.options.body), project.details.documents[0]);
  }
});
