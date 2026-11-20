const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
function load(file, imports) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => { if (!(name in imports)) throw Error(name); return imports[name]; }, module, module.exports);
  return module.exports;
}
function nodes(node) { return React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(nodes)] : []; }
const native = { Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: value => value }, Platform: { OS: 'web' }, useWindowDimensions: () => ({ width: 390, height: 844 }) };
const hub = load('src/components/projects/hub/ProjectHubUI.tsx', {
  react: { createContext: value => ({ value, Provider: 'Provider' }), useContext: context => context.value, useRef: value => ({ current: value }), useEffect() {} },
  'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': native, 'expo-symbols': { SymbolView: 'SymbolView' }, '@/constants/colors': { colors: {} }, './FullProjectImage': { FullProjectImage: 'FullProjectImage' },
});
test('page presentation has a back header and scrollable content without a Modal', () => {
  hub.HubPagePresentation.value = true;
  let closed = 0;
  const tree = nodes(hub.HubModal({ title: 'Settings', onClose: () => closed++, children: 'Content', footer: 'Save', appearance: 'chat' }));
  assert.equal(tree.filter(n => n.type === 'Modal').length, 0);
  assert.equal(tree.filter(n => n.type === 'ScrollView').length, 1);
  tree.find(n => n.props.accessibilityLabel === 'Quay lại').props.onPress();
  assert.equal(closed, 1);
  assert.ok(tree.some(n => n.props.children === 'Save'));
});
test('default presentation still uses a popup', () => {
  hub.HubPagePresentation.value = false;
  assert.equal(nodes(hub.HubModal({ title: 'Settings', onClose() {}, children: null })).filter(n => n.type === 'Modal').length, 1);
});
const group = { id: 'room', type: 1, myRole: 2, name: 'Group', avatarUrl: null, members: [{ role: 2, person: { accountId: 'self', fullName: 'Me' } }, { role: 0, person: { accountId: 'member', fullName: 'Member' } }] };
const { ChatDetailsModal } = load('src/components/messaging/ChatDetailsModal.tsx', {
  react: { useState: initial => [initial, () => {}], useEffect() {} }, 'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': { ...native, Switch: 'Switch' },
  'expo-router': { router: {} }, 'expo-symbols': { SymbolView: 'SymbolView' }, 'expo-image-picker': {},
  '@/store/auth.store': { useAuthStore: () => ({ account: { id: 'self', role: 0 } }) }, '@/services/messaging.service': { messagingService: {} }, '@/services/image.service': {}, '@/services/project-hub.service': {}, '@/services/friendship.service': { friendshipService: {} },
  '@/components/projects/hub/ProjectHubUI': { HubModal: 'HubModal', HubAction: 'HubAction', HubIcon: 'HubIcon' }, '@/components/projects/hub/ProjectHubFields': { Field: 'Field' }, '@/components/projects/hub/PersonAvatar': { PersonAvatar: 'PersonAvatar' }, '@/components/friends/FriendActions': { FriendActions: 'FriendActions' }, './AddChatMembers': { AddChatMembers: 'AddChatMembers' }, './SharedChatFiles': { SharedChatFiles: 'SharedChatFiles' },
});
test('controlled settings navigate to sections and return through the supplied back action', () => {
  const moves = [];
  const tree = nodes(ChatDetailsModal({ conversation: group, onClose() {}, onChanged: async () => {}, section: null, onSectionChange: (...args) => moves.push(args) }));
  tree.find(n => n.props.title === 'Xem thành viên').props.onPress();
  assert.deepEqual(moves[0], ['members']);
  const memberTree = nodes(ChatDetailsModal({ conversation: group, onClose() {}, onChanged: async () => {}, section: 'members', onSectionChange: (...args) => moves.push(args) }));
  assert.equal(memberTree[0].props.title, 'Thành viên nhóm');
  memberTree[0].props.onClose();
  assert.deepEqual(moves[1], [null]);
});
test('shared files and member role pages render from route state', () => {
  const props = { conversation: group, onClose() {}, onChanged: async () => {}, onSectionChange() {} };
  assert.equal(ChatDetailsModal({ ...props, section: 'files' }).type, 'SharedChatFiles');
  assert.equal(ChatDetailsModal({ ...props, section: 'role', memberId: 'member' }).props.title, 'Quyền thành viên');
});

test('route state cannot expose group administration to regular members', () => {
  const base = { conversation: { ...group, myRole: 0 }, onClose() {}, onChanged: async () => {}, onSectionChange() {} };
  for (const section of ['name', 'add', 'link', 'role']) {
    const tree = ChatDetailsModal({ ...base, section, memberId: 'member' });
    assert.equal(tree.props.title, 'Thông tin nhóm');
  }
});
test('mobile entry pushes settings route while large screens open their existing modal', () => {
  const source = fs.readFileSync('src/components/messaging/MessagingScreen.tsx', 'utf8');
  const sf = ts.createSourceFile('screen.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let entry;
  function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(sf) === 'openDetails') entry = node.initializer.getText(sf); ts.forEachChild(node, visit); }
  visit(sf);
  for (const compact of [true, false]) {
    let pushed, modal = false;
    new Function('compact', 'conversation', 'router', 'setDetails', `return (${entry})();`)(compact, group, { push: value => pushed = value }, value => modal = value);
    if (compact) assert.deepEqual(pushed, { pathname: '/chat/[id]/settings', params: { id: 'room' } });
    else { assert.equal(pushed, undefined); assert.equal(modal, true); }
  }
});
for (const width of [390, 1280]) test(`settings route presentation and navigation at width ${width}`, () => {
  const actions = [];
  const params = { id: 'room', section: 'members' };
  let stateIndex = 0;
  const { ChatSettingsScreen } = load('src/components/messaging/ChatSettingsScreen.tsx', {
    react: { useState: initial => [stateIndex++ === 0 ? group : initial, () => {}], useCallback: callback => callback },
    'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': { ...native, useWindowDimensions: () => ({ width }) },
    'expo-router': { Redirect: 'Redirect', useLocalSearchParams: () => params, useFocusEffect() {}, router: { push: value => actions.push(value), back: () => actions.push('back'), canGoBack: () => true } },
    '@/store/auth.store': { useAuthStore: () => ({ account: { role: 0 }, isAuthenticated: true, isLoading: false }) },
    '@/services/messaging.service': { messagingService: {} }, '@/messaging/device': { messageRoute: () => '/(tabs)/messages' },
    '@/components/projects/hub/ProjectHubUI': { HubModal: 'HubModal', HubAction: 'HubAction', HubPagePresentation: { Provider: 'PageProvider' } },
    './ChatDetailsModal': { ChatDetailsModal: 'ChatDetailsModal' }, './ChatProvider': { useChat: () => ({ revision: 0, refresh() {} }) },
  });
  const tree = nodes(ChatSettingsScreen());
  assert.equal(tree[0].props.value, width < 800);
  const details = tree.find(n => n.type === 'ChatDetailsModal');
  assert.equal(details.props.section, 'members');
  details.props.onSectionChange('role', 'member');
  assert.deepEqual(actions[0], { pathname: '/chat/[id]/settings', params: { id: 'room', section: 'role', memberId: 'member' } });
  details.props.onSectionChange(null);
  assert.equal(actions[1], 'back');
});
for (const [role, route] of [[0, '/(tabs)/messages'], [1, '/(company)/company-messages'], [2, '/(assessor)/assessor-messages']]) test(`direct settings links return to messages for account role ${role}`, () => {
  let cursor = 0, replaced;
  const { ChatSettingsScreen } = load('src/components/messaging/ChatSettingsScreen.tsx', {
    react: { useState: initial => [cursor++ === 0 ? group : initial, () => {}], useCallback: callback => callback },
    'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': native,
    'expo-router': { Redirect: 'Redirect', useLocalSearchParams: () => ({ id: 'room' }), useFocusEffect() {}, router: { canGoBack: () => false, replace: value => replaced = value } },
    '@/store/auth.store': { useAuthStore: () => ({ account: { role }, isAuthenticated: true }) }, '@/services/messaging.service': { messagingService: {} },
    '@/messaging/device': { messageRoute: currentRole => { assert.equal(currentRole, role); return route; } },
    '@/components/projects/hub/ProjectHubUI': { HubPagePresentation: { Provider: 'PageProvider' }, HubModal: 'HubModal' },
    './ChatDetailsModal': { ChatDetailsModal: 'ChatDetailsModal' }, './ChatProvider': { useChat: () => ({ revision: 0 }) },
  });
  nodes(ChatSettingsScreen()).find(n => n.type === 'ChatDetailsModal').props.onClose();
  assert.deepEqual(replaced, { pathname: route, params: { conversationId: 'room' } });
});
