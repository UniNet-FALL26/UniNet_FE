const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// Expo Notifications and RNFirebase both declare these defaults. Keep one value
// through prebuild, including builds without google-services.json yet. Register
// this plugin first: manifest mods execute in reverse registration order.
module.exports = config => {
  config = withAndroidManifest(config, mod => {
  const manifest = mod.modResults.manifest;
  manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  const app = manifest.application[0];
  app['meta-data'] ??= [];
  const iconName = 'com.google.firebase.messaging.default_notification_icon';
  let icon = app['meta-data'].find(item => item.$['android:name'] === iconName);
  if (!icon) { icon = { $: { 'android:name': iconName } }; app['meta-data'].push(icon); }
  icon.$['android:resource'] = '@drawable/ic_uninet_notification'; icon.$['tools:replace'] = 'android:resource';
  for (const [name, attribute] of [
    ['com.google.firebase.messaging.default_notification_channel_id', 'android:value'],
    ['com.google.firebase.messaging.default_notification_color', 'android:resource'],
  ]) {
    const entry = app['meta-data']?.find(item => item.$['android:name'] === name);
    if (entry) entry.$['tools:replace'] = [...new Set((entry.$['tools:replace'] || '').split(',').filter(Boolean).concat(attribute))].join(',');
  }
  return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    const directory = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/drawable');
    await fs.mkdir(directory, { recursive: true });
    // UniNet's U and paper-plane mark, adapted to the Android monochrome mask.
    await fs.writeFile(path.join(directory, 'ic_uninet_notification.xml'), '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24"><path android:fillColor="#FFFFFFFF" android:pathData="M4.4,5.2L8.8,7.8V14.2L11.6,16L14.4,14.2V8.8L19,11.8V16.8L14.8,19.7H9.3L4.4,16.8ZM14.4,6.8L19.9,4.4L18.1,10Z"/></vector>\n');
    return mod;
  }]);
};
