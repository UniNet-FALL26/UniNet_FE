const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('src/messaging/push.types.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exportsObject = {}; vm.runInNewContext(source, { exports: exportsObject }); const { parseChatPush } = exportsObject;

test('notification deep links use validated identifiers and never a supplied external URL', () => {
  const conversationId = 'a3ced72f-a756-447d-94b0-7210dc12a31c', messageId = 'e9bd3a4b-a54d-4383-9fd0-c94f926daae4';
  const value = parseChatPush({ type: 'chat_message', conversationId, messageId, deepLink: 'https://attacker.invalid/token' });
  assert.equal(value.deepLink, `/messages?conversationId=${conversationId}&messageId=${messageId}`);
  assert.equal(parseChatPush({ type: 'chat_message', conversationId: '../private', messageId }), null);
  assert.equal(parseChatPush({ type: 'other', conversationId, messageId }), null);
});

test('native config keeps notification overrides and a monochrome icon when Expo and Firebase coexist', async () => {
  const plugin = require('../plugins/with-chat-notifications');
  const config = plugin({ name: 'test', slug: 'test' });
  const manifest = { manifest: { $: {}, application: [{ 'meta-data': [
    { $: { 'android:name': 'com.google.firebase.messaging.default_notification_color', 'android:resource': '@color/notification_icon_color' } },
    { $: { 'android:name': 'com.google.firebase.messaging.default_notification_channel_id', 'android:value': 'uninet-messages' } },
  ] }] } };
  const result = await config.mods.android.manifest({ ...config, modResults: manifest, modRequest: { platform: 'android', modName: 'manifest', projectRoot: process.cwd() } });
  const metadata = result.modResults.manifest.application[0]['meta-data'];
  assert.equal(metadata.find(x => x.$['android:name'].endsWith('channel_id')).$['tools:replace'], 'android:value');
  assert.equal(metadata.find(x => x.$['android:name'].endsWith('notification_color')).$['tools:replace'], 'android:resource');
  assert.equal(metadata.find(x => x.$['android:name'].endsWith('notification_icon')).$['android:resource'], '@drawable/ic_uninet_notification');
});

test('web push uses the app logo even when the sender has an avatar', async () => {
  const conversationId = 'a3ced72f-a756-447d-94b0-7210dc12a31c', messageId = 'e9bd3a4b-a54d-4383-9fd0-c94f926daae4';
  let background, shown;
  const context = { URL, importScripts() {}, firebase: { initializeApp() {}, messaging: () => ({ onBackgroundMessage: callback => { background = callback; } }) },
    self: { addEventListener() {}, location: { href: 'https://uninet.test/firebase-messaging-sw.js?config=' + encodeURIComponent(JSON.stringify({ projectId: 'test', messagingSenderId: 'test', appId: 'test', apiKey: 'test' })) }, registration: { showNotification: async (title, options) => { shown = options; } } } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('public/firebase-messaging-sw.js', 'utf8'), context);
  vm.runInContext('remember = async () => true', context);
  await background({ data: { type: 'chat_message', conversationId, messageId, senderName: 'Alice', messagePreview: 'Hello', senderAvatarUrl: 'https://example.test/avatar.png' } });
  assert.equal(shown.icon, '/notification-icon.png');
  assert.equal(shown.badge, '/notification-badge.png');
  assert.ok(fs.existsSync('public/notification-icon.png'));
  assert.ok(fs.existsSync('public/notification-badge.png'));
});
