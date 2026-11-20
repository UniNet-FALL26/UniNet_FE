const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('Android channel uses the system notification sound without a nonexistent custom asset', async () => {
  let channel;
  const sdk = { getMessaging: () => ({}), hasPermission: async () => 1, getToken: async () => 'fixture-token' };
  const modules = {
    'expo-constants': { __esModule: true, default: { executionEnvironment: 'bare', expoConfig: { extra: { firebaseAndroidEnabled: true } } } },
    'react-native': { Platform: { OS: 'android', Version: 36 }, PermissionsAndroid: { PERMISSIONS: { POST_NOTIFICATIONS: 'notification' }, check: async () => true } },
    '@react-native-firebase/messaging': sdk,
    'expo-notifications': { AndroidImportance: { HIGH: 6 }, setNotificationChannelAsync: async (id, options) => { channel = { id, ...options }; } },
    './push.types': {},
  };
  const source = ts.transpileModule(fs.readFileSync('src/messaging/push.native.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => { if (!(name in modules)) throw new Error('Missing mock: ' + name); return modules[name]; } });
  assert.equal(await exports.existingPushToken(), 'fixture-token');
  assert.equal(channel.id, 'uninet-messages');
  assert.equal(channel.importance, 6);
  // Expo SDK 57 treats a supplied string as a bundled custom sound filename.
  // Omitting it preserves Android's default sound and the user's channel setting.
  assert.equal(Object.hasOwn(channel, 'sound'), false);
});
