const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const utilityModule = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/chat-files.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(utilityModule, utilityModule.exports);
const fileUtils = utilityModule.exports;

function harness(file, initial = [], overrides = {}) {
  const state = [...initial];
  let cursor = 0, effectCursor = 0;
  const effectDependencies = [], pendingEffects = [];
  const imports = {
    react: { useEffect(callback, dependencies) { const index = effectCursor++; const previous = effectDependencies[index]; if (!previous || !dependencies || dependencies.some((value, i) => !Object.is(value, previous[i]))) { pendingEffects.push(callback); effectDependencies[index] = dependencies; } }, useRef(value) { const index = cursor++; if (!(index in state)) state[index] = { current: value }; return state[index]; }, useState(value) { const index = cursor++; if (!(index in state)) state[index] = value; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; } },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { ActivityIndicator: 'ActivityIndicator', Image: 'Image', Modal: 'Modal', Platform: { OS: 'web' }, Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width: 1200, height: 900 }) },
    'expo-video': { useVideoPlayer() {}, VideoView: 'VideoView' },
    'expo-symbols': { SymbolView: 'SymbolView' },
    '@/services/messaging.service': { messagingService: {} },
    '@/utils/load-chat-attachment': { loadChatAttachment: async () => ({ uri: 'file:///cache/media', dispose() {} }) },
    '@/constants/config': { API_URL: 'https://example.test/api' },
    '@/utils/storage': { tokenStorage: {} },
    '@/services/api': {},
    '@/components/projects/hub/PersonAvatar': { PersonAvatar: 'PersonAvatar' },
    './ChatAttachment': { ChatAttachment: 'ChatAttachment' },
    './ChatImageViewer': { ChatImageViewer: 'ChatImageViewer' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    './ChatVideoPreview': { ChatVideoPreview: 'ChatVideoPreview' },
    './ChatDocumentIcon': { ChatDocumentIcon: 'ChatDocumentIcon' },
    './ChatMediaThumbnail': { ChatMediaThumbnail: 'ChatMediaThumbnail' },
    '@/utils/chat-files': fileUtils,
    '@/utils/download-chat-attachment': { downloadChatAttachment: async () => {} },
    '@/components/projects/hub/ProjectHubUI': { HubModal: 'HubModal', HubAction: 'HubAction', HubIcon: 'HubIcon' },
    '@/services/project-hub.service': { projectHubService: {} },
    './ChatPeoplePicker': { ChatPeoplePicker: 'ChatPeoplePicker' },
  };
  Object.assign(imports, overrides);
  const source = fs.readFileSync(path.join(__dirname, '../src/components/messaging', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => { if (!(name in imports)) throw Error(name); return imports[name]; }, module, module.exports);
  const render = props => { cursor = 0; effectCursor = 0; return Object.values(module.exports)[0](props); };
  render.flushEffects = async () => { for (const callback of pendingEffects.splice(0)) callback(); await new Promise(setImmediate); };
  return render;
}
function find(node, type) {
  if (!React.isValidElement(node)) return [];
  return [...(node.type === type ? [node] : []), ...React.Children.toArray(node.props.children).flatMap(child => find(child, type))];
}
const file = { id: 'image-1', fileType: 0, fileName: 'diagram.png', fileUrl: '/messaging/attachments/image-1/content', fileSize: 1024, mimeType: 'image/png' };

test('loading attachments never render bare strings under View', () => {
  const render = harness('ChatAttachment.tsx');
  const tree = render({ file });
  for (const view of find(tree, 'View')) {
    assert.equal(React.Children.toArray(view.props.children).some(child => typeof child === 'string'), false);
  }
});
test('images show the complete image and adapt to landscape and portrait dimensions', () => {
  const render = harness('ChatAttachment.tsx', ['blob:test', '', 0, false]);
  for (const [width, height] of [[1200, 400], [400, 1200]]) {
    const image = find(render({ file }), 'Image')[0];
    assert.equal(image.props.resizeMode, 'contain');
    image.props.onLoad({ nativeEvent: { source: { width, height } } });
    const style = Object.assign({}, ...[find(render({ file }), 'Image')[0].props.style].flat());
    assert.equal(style.aspectRatio, width / height);
    assert.equal(style.height, undefined);
  }
});
test('web image load events use the image target instead of nativeEvent.source', () => {
  const render = harness('ChatAttachment.tsx', ['blob:test', '', 0, false]);
  for (const event of [
    { nativeEvent: { target: { naturalWidth: 1200, naturalHeight: 400 } } },
    { target: { naturalWidth: 1200, naturalHeight: 400 } },
    { nativeEvent: {}, target: { naturalWidth: 1200, naturalHeight: 400 } },
  ]) {
    find(render({ file }), 'Image')[0].props.onLoad(event);
    const style = Object.assign({}, ...find(render({ file }), 'Image')[0].props.style);
    assert.equal(style.aspectRatio, 3);
  }
});
test('missing or invalid image dimensions do not crash or replace the last valid ratio', () => {
  const render = harness('ChatAttachment.tsx', ['blob:test', '', 0, false]);
  find(render({ file }), 'Image')[0].props.onLoad({ nativeEvent: { source: { width: 600, height: 300 } } });
  for (const event of [{}, { nativeEvent: {} }, { target: { naturalWidth: 0, naturalHeight: 0 } }, { nativeEvent: { source: { width: Infinity, height: 10 } } }]) {
    assert.doesNotThrow(() => find(render({ file }), 'Image')[0].props.onLoad(event));
    const style = Object.assign({}, ...find(render({ file }), 'Image')[0].props.style);
    assert.equal(style.aspectRatio, 2);
  }
});
test('loaded images have no file card footer or opaque frame', () => {
  const tree = harness('ChatAttachment.tsx', ['blob:test', '', 0, false])({ file });
  assert.equal(find(tree, 'Text').some(text => text.props.children === file.fileName), false);
  const style = Object.assign({}, ...[tree.props.style].flat());
  assert.equal(style.backgroundColor, 'transparent');
  assert.equal(style.borderWidth, 0);
});
test('documents retain their filename and download control', () => {
  const tree = harness('ChatAttachment.tsx')({ file: { ...file, fileType: 2, fileName: 'report.pdf' } });
  assert.equal(find(tree, 'Text').some(text => text.props.children === 'report.pdf'), true);
  assert.ok(find(tree, 'Pressable').length);
});
test('image-only messages remove the bubble background while text messages keep it', () => {
  const render = harness('ChatMessageBubble.tsx');
  const message = { id: 'm1', type: 0, attachments: [file], content: null, reactions: [], sender: {}, createdAt: '2026-11-20T00:00:00Z' };
  const props = { message, own: true, first: true, last: false, readNames: [] };
  const style = input => Object.assign({}, ...find(render(input), 'Pressable')[0].props.style.filter(Boolean));
  assert.equal(style(props).backgroundColor, 'transparent');
  assert.equal(style(props).paddingHorizontal, 0);
  assert.equal(style({ ...props, message: { ...message, content: 'hello' } }).backgroundColor, '#1769E0');
});

test('draft images show a local preview with MIME type or filename detection', () => {
  for (const input of [{ uri: 'file://photo', name: 'photo', mimeType: 'image/png' }, { uri: 'blob:photo', name: 'photo.JPG' }]) {
    let removed = false;
    const tree = harness('ChatDraftAttachment.tsx')({ file: input, onRemove: () => { removed = true; } });
    const image = find(tree, 'Image')[0];
    assert.equal(image.props.source.uri, input.uri);
    assert.equal(image.props.resizeMode, 'contain');
    find(tree, 'Pressable')[0].props.onPress();
    assert.equal(removed, true);
  }
});
test('draft documents show filename, format and size instead of an image', () => {
  const tree = harness('ChatDraftAttachment.tsx')({ file: { uri: 'file://report', name: 'report.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 2048 }, onRemove() {} });
  assert.equal(find(tree, 'Image').length, 0);
  const text = find(tree, 'Text').map(node => node.props.children);
  assert.ok(text.includes('report.docx'));
  assert.ok(text.includes('DOCX · 2 KB'));
});
test('an unreadable draft image falls back to its file card and remains removable', () => {
  const render = harness('ChatDraftAttachment.tsx');
  const props = { file: { uri: 'blob:broken', name: 'broken.png' }, onRemove() {} };
  find(render(props), 'Image')[0].props.onError();
  const tree = render(props);
  assert.equal(find(tree, 'Image').length, 0);
  assert.ok(find(tree, 'Text').some(node => node.props.children === 'broken.png'));
  assert.equal(find(tree, 'Pressable').length, 1);
});
test('draft videos show a media preview for MIME types and filename extensions', () => {
  for (const input of [{ uri: 'file://clip', name: 'clip', mimeType: 'video/mp4' }, { uri: 'blob:clip', name: 'clip.MOV' }]) {
    const tree = harness('ChatDraftAttachment.tsx')({ file: input, onRemove() {} });
    const preview = find(tree, 'ChatVideoPreview')[0];
    assert.ok(preview);
    assert.equal(preview.props.uri, input.uri);
    assert.equal(preview.props.compact, true);
  }
});
test('sent videos display inline without a filename footer or bubble background', () => {
  const video = { ...file, fileType: 1, fileName: 'clip.mp4', mimeType: 'video/mp4' };
  const tree = harness('ChatAttachment.tsx', ['blob:clip', '', 0, false])({ file: video });
  assert.equal(find(tree, 'ChatVideoPreview').length, 1);
  assert.equal(find(tree, 'Text').some(node => node.props.children === video.fileName), false);
  const bubble = harness('ChatMessageBubble.tsx')({ message: { id: 'm', type: 0, attachments: [video], content: null, reactions: [], sender: {} }, own: true, first: false, last: false, readNames: [] });
  const style = Object.assign({}, ...find(bubble, 'Pressable')[0].props.style.filter(Boolean));
  assert.equal(style.backgroundColor, 'transparent');
});
test('web video previews decode a frame without autoplay and preserve portrait dimensions', () => {
  const render = harness('ChatVideoPreview.web.tsx');
  const props = { uri: 'blob:video', label: 'clip.mp4' };
  const video = find(render(props), 'video')[0];
  assert.equal(video.props.autoPlay, undefined);
  assert.equal(video.props.controls, false);
  assert.equal(video.props.style.objectFit, 'contain');
  const element = { videoWidth: 400, videoHeight: 1200, duration: 65, currentTime: 0 };
  video.props.onLoadedMetadata({ currentTarget: element });
  assert.equal(element.currentTime, 0.05);
  const tree = render(props);
  assert.equal(Object.assign({}, ...tree.props.style).aspectRatio, 1 / 3);
  assert.ok(find(tree, 'Text').some(node => React.Children.toArray(node.props.children).join('') === '1:05'));
  video.props.onPlay();
  assert.equal(find(render(props), 'video')[0].props.controls, true);
  video.props.onPause();
  assert.equal(find(render(props), 'video')[0].props.controls, false);
});
test('compact video previews stay muted and failed playback keeps the file removable', () => {
  const tree = harness('ChatVideoPreview.web.tsx')({ uri: 'blob:draft', label: 'draft.mp4', compact: true });
  assert.equal(find(tree, 'video')[0].props.muted, true);
  const render = harness('ChatDraftAttachment.tsx');
  const props = { file: { uri: 'blob:bad', name: 'bad.mp4' }, onRemove() {} };
  find(render(props), 'ChatVideoPreview')[0].props.onError();
  assert.equal(find(render(props), 'ChatVideoPreview').length, 0);
  assert.ok(find(render(props), 'Text').some(node => node.props.children === 'bad.mp4'));
});
test('recognized documents have format-specific icons, with a generic icon only for unknown files', () => {
  for (const [name, mimeType, label] of [['report.PDF', undefined, 'PDF'], ['report.docx', undefined, 'DOCX'], ['sheet.xlsx', undefined, 'XLSX'], ['slides.pptx', undefined, 'PPTX'], ['notes.txt', undefined, 'TXT'], ['no-extension', 'application/pdf', 'PDF']]) {
    const format = fileUtils.documentPresentation(name, mimeType);
    assert.equal(format.label, label); assert.equal(format.known, true);
    const tree = harness('ChatDocumentIcon.tsx')({ name, mimeType });
    assert.equal(find(tree, 'SymbolView').length, 0);
    assert.ok(find(tree, 'Text').some(node => node.props.children === label));
  }
  assert.equal(fileUtils.documentPresentation('unknown.bin', 'application/octet-stream').known, false);
  assert.equal(fileUtils.documentPresentation('unknown.constructor', 'application/octet-stream').known, false);
  assert.equal(fileUtils.documentPresentation('unknown.__proto__', 'application/octet-stream').known, false);
  assert.equal(find(harness('ChatDocumentIcon.tsx')({ name: 'unknown.bin' }), 'SymbolView').length, 1);
  assert.equal(fileUtils.formatChatFileSize(0), '0 B');
  assert.equal(fileUtils.formatChatFileSize(2048), '2 KB');
});
test('draft and sent documents use the same document icon component', () => {
  assert.equal(find(harness('ChatDraftAttachment.tsx')({ file: { name: 'report.pdf', uri: 'blob:pdf' }, onRemove() {} }), 'ChatDocumentIcon')[0].props.name, 'report.pdf');
  assert.equal(find(harness('ChatAttachment.tsx')({ file: { ...file, fileType: 2, fileName: 'report.pdf' } }), 'ChatDocumentIcon')[0].props.name, 'report.pdf');
});
test('the shared gallery filters by category and returns from preview without losing selection', () => {
  const image = { ...file, fileName: 'photo.png' };
  const video = { ...file, id: 'v1', fileType: 1, fileName: 'clip.mp4' };
  const document = { ...file, id: 'd1', fileType: 2, fileName: 'report.pdf' };
  for (const type of [0, 1]) {
    const render = harness('SharedChatFiles.tsx', [[image, video, document], 1, 0, false, false, '', 'all', [], null, false]);
    const props = { conversation: { id: 'room', type }, onClose() {} };
    const get = () => render(props);
    assert.equal(get().props.dismissControl, 'back');
    assert.equal(find(get(), 'ChatMediaThumbnail').length, 2);
    find(get(), 'Pressable').find(node => node.props.accessibilityLabel === 'Chọn photo.png').props.onPress();
    assert.equal(find(get(), 'HubAction').find(node => node.props.title === 'Tải xuống').props.disabled, false);
    find(get(), 'Pressable').find(node => node.props.accessibilityLabel === 'Xem photo.png').props.onPress();
    assert.equal(find(get(), 'ChatImageViewer')[0].props.file.id, image.id);
    get().props.onClose();
    assert.equal(find(get(), 'Pressable').find(node => node.props.accessibilityLabel === 'Chọn photo.png').props.accessibilityState.checked, true);
    const videoTab = find(get(), 'Pressable').find(node => node.props.accessibilityRole === 'tab' && find(node, 'Text').some(text => text.props.children === 'Video'));
    videoTab.props.onPress();
    assert.equal(find(get(), 'ChatMediaThumbnail').length, 1);
    assert.equal(find(get(), 'ChatMediaThumbnail')[0].props.file.id, video.id);
  }
});
test('a linked chat offers approved project participants without requiring friendship', async () => {
  const added = []; let saved = 0;
  const conversation = { id: 'room', project: { id: 'project', title: 'Linked project' }, members: [
    { leftAt: null, person: { accountId: 'existing-account', profileId: 'existing-profile' } },
    { leftAt: '2026-01-01', person: { accountId: 'returning-account', profileId: 'returning-profile' } },
  ] };
  const members = [
    { userId: 'new-profile', fullName: 'Approved member', status: 0 },
    { userId: 'existing-profile', fullName: 'Already in chat', status: 0 },
    { userId: 'inactive-profile', fullName: 'Inactive member', status: 2 },
    { userId: 'returning-profile', fullName: 'Returning member', status: 0 },
  ];
  const render = harness('AddChatMembers.tsx', [], {
    '@/services/project-hub.service': { projectHubService: { get: async () => ({ members }) } },
    '@/services/messaging.service': { messagingService: { addMembers: async (...args) => added.push(args) } },
  });
  const props = { conversation, onClose() {}, onSaved: async () => { saved++; } };
  render(props); await render.flushEffects();
  const choices = find(render(props), 'Pressable').filter(node => node.props.accessibilityRole === 'checkbox');
  assert.deepEqual(choices.map(node => node.props.accessibilityLabel), ['Approved member', 'Returning member']);
  choices[0].props.onPress();
  const friendTab = find(render(props), 'Pressable').find(node => node.props.accessibilityLabel === 'Bạn bè');
  friendTab.props.onPress();
  const picker = find(render(props), 'ChatPeoplePicker')[0];
  assert.deepEqual(picker.props.selectedProfileIds, ['new-profile']);
  picker.props.onSelect({ profileId: 'new-profile', accountId: 'new-account', fullName: 'Approved member' });
  assert.deepEqual(find(render(props), 'ChatPeoplePicker')[0].props.selectedProfileIds, []);
  find(render(props), 'ChatPeoplePicker')[0].props.onSelect({ profileId: 'new-profile', accountId: 'new-account', fullName: 'Approved member' });
  find(render(props).props.footer, 'HubAction').find(node => node.props.variant === 'primary').props.onPress();
  await new Promise(setImmediate);
  assert.deepEqual(added, [['room', [], ['new-profile']]]);
  assert.equal(saved, 1);
});
test('project roster failures are visible and can be retried', async () => {
  let requests = 0;
  const render = harness('AddChatMembers.tsx', [], {
    '@/services/project-hub.service': { projectHubService: { get: async () => { if (++requests === 1) throw Error('Roster unavailable'); return { members: [] }; } } },
  });
  const props = { conversation: { id: 'room', project: { id: 'p', title: 'Project' }, members: [] }, onClose() {}, onSaved: async () => {} };
  render(props); await render.flushEffects();
  assert.ok(find(render(props), 'Text').some(node => node.props.role === 'alert' && node.props.children === 'Roster unavailable'));
  find(render(props), 'HubAction').find(node => node.props.title === 'Tải lại thành viên').props.onPress();
  render(props); await render.flushEffects();
  assert.equal(requests, 2);
  assert.equal(find(render(props), 'Text').some(node => node.props.role === 'alert'), false);
});
test('an unlinked chat starts with friend selection', () => {
  const tree = harness('AddChatMembers.tsx')({ conversation: { id: 'room', project: null, members: [] }, onClose() {}, onSaved: async () => {} });
  assert.equal(find(tree, 'ChatPeoplePicker').length, 1);
  assert.equal(find(tree, 'Pressable').filter(node => node.props.accessibilityRole === 'tab').length, 0);
});

test('web attachment controls are not nested inside a button and long press still opens actions', () => {
  let opened = 0;
  const tree = harness('ChatMessageBubble.tsx')({ message: { id: 'image-message', type: 0, attachments: [file], content: null, reactions: [], sender: {} }, own: true, first: false, last: false, readNames: [], onActions: () => opened++ });
  const bubble = find(tree, 'Pressable')[0];
  assert.notEqual(bubble.props.accessibilityRole, 'button');
  bubble.props.onLongPress();
  assert.equal(opened, 1);
  assert.equal(find(bubble, 'ChatAttachment').length, 1);
});

test('sent media and gallery previews use resolved local resources without bearer headers', async () => {
  for (const fileType of [0, 1]) {
    for (const component of ['ChatAttachment.tsx', 'ChatMediaThumbnail.tsx']) {
      const render = harness(component);
      const props = { file: { ...file, fileType } };
      render(props); await render.flushEffects();
      const preview = find(render(props), fileType === 0 ? 'Image' : 'ChatVideoPreview')[0];
      assert.ok(preview);
      assert.equal(fileType === 0 ? preview.props.source.uri : preview.props.uri, 'file:///cache/media');
      assert.equal(fileType === 0 ? preview.props.source.headers : preview.props.headers, undefined);
    }
  }
});

test('chat images stay within a compact viewport-aware frame for portrait and landscape media', () => {
  for (const viewport of [{ width: 320, height: 640 }, { width: 393, height: 852 }, { width: 1200, height: 900 }]) {
    const render = harness('ChatAttachment.tsx', ['file:///photo', '', 0, false], {
      'react-native': { ActivityIndicator: 'ActivityIndicator', Image: 'Image', Pressable: 'Pressable', Text: 'Text', View: 'View', StyleSheet: { create: value => value }, useWindowDimensions: () => viewport },
    });
    for (const [width, height] of [[1200, 400], [400, 1200], [400, 4000], [4000, 200]]) {
      find(render({ file }), 'Image')[0].props.onLoad({ nativeEvent: { source: { width, height } } });
      const tree = render({ file });
      const frame = Object.assign({}, ...tree.props.style.filter(Boolean));
      const image = find(tree, 'Image')[0];
      const imageStyle = Object.assign({}, ...image.props.style.filter(Boolean));
      assert.equal(image.props.resizeMode, 'contain');
      assert.ok(frame.width <= Math.min(280, viewport.width * 0.68));
      assert.ok(frame.width / imageStyle.aspectRatio <= Math.min(300, viewport.height * 0.4) + 0.001);
      assert.equal(imageStyle.aspectRatio, width / height);
    }
  }
});
test('full-screen image presentation fills the viewer without message thumbnail limits', () => {
  const tree = harness('ChatAttachment.tsx', ['file:///photo', '', 0, false])({ file, fullScreen: true });
  const frame = Object.assign({}, ...tree.props.style.filter(Boolean));
  const image = find(tree, 'Image')[0];
  const photo = Object.assign({}, ...image.props.style.filter(Boolean));
  assert.equal(frame.flex, 1);
  assert.equal(frame.width, '100%');
  assert.equal(photo.width, '100%');
  assert.equal(photo.height, '100%');
  assert.equal(image.props.resizeMode, 'contain');
});
test('gallery image viewer covers the screen and closes back to the existing gallery', () => {
  let closed = 0;
  const tree = harness('ChatImageViewer.tsx')({ file, onClose: () => closed++ });
  assert.equal(tree.type, 'Modal');
  assert.equal(tree.props.visible, true);
  assert.equal(find(tree, 'ChatAttachment')[0].props.fullScreen, true);
  const overlay = find(tree, 'View')[0];
  const style = Object.assign({}, ...[overlay.props.style].flat());
  assert.equal(style.flex, 1);
  assert.equal(style.backgroundColor, '#080B10');
  tree.props.onRequestClose();
  assert.equal(closed, 1);
});
