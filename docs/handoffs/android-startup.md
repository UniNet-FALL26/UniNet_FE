# Android startup recovery

## Failure and fix
The installed Android debug build crashed with `RuntimeException: Unable to load script` / missing `index.android.bundle`. Generated MainApplication called ExpoReactHostFactory without an explicit useDevSupport argument. The installed Expo implementation defaults to ReactBuildConfig.DEBUG from the prebuilt React Native library, rather than the application's BuildConfig.DEBUG.

`plugins/with-android-dev-support.js` adds `useDevSupport = BuildConfig.DEBUG` using the Expo withMainApplication mod. It is registered in app.json, so regenerating the ignored android directory preserves the fix. Debug builds use Metro; release builds retain bundled-asset loading. The plugin is idempotent and rejects an unsupported template rather than silently missing the fix. Reference: [Expo config plugins](https://docs.expo.dev/config-plugins/plugins/).

Separately, project.service mock/fallback records used Vietnamese display labels as status values. They now use the existing contract codes Public/Open/Pending/Sent. Project filters and join eligibility compare these codes. Display labels remain in src/types/project.ts.

## Commands
From UniNet_FE, after installing dependencies:

```powershell
npx expo prebuild --platform android --no-install
npm run android
```

For USB debugging with localhost on Windows, run Metro in one terminal (IPv4 avoids binding only to ::1):

```powershell
$env:NODE_OPTIONS = ($env:NODE_OPTIONS + ' --dns-result-order=ipv4first').Trim()
npx expo start --localhost --port 8084
```

Then run in another terminal:

```powershell
npx expo run:android --device --port 8084
```

Expo normally sets up ADB reverse automatically. Manual mapping is `adb -s <serial> reverse tcp:8084 tcp:8084` when both Metro and the APK use 8084. For an existing APK compiled for 8081, map `tcp:8081` to `tcp:8084`. Expo's named `--device` option takes the AVD/device name (e.g. Pixel_8), rather than the ADB serial emulator-5554; `--device` alone prompts for a device.

Adding a native package such as datetimepicker requires rebuilding the APK, not only restarting Metro. Dependencies are already installed here; the current Expo package compatibility check reports patch-version recommendations, but that does not explain the observed asset-loading crash.

## Verification
- Reproduced the native startup failure from com.uninet.mobile AndroidRuntime logs.
- TypeScript check passes after fixing eight project service status errors.
- Four project fallback regression tests pass: `node tests/project-service.test.cjs`.
- Three config-plugin tests pass: `node tests/android-dev-support.test.cjs`.
- Android Metro/Hermes export succeeds.
- Expo Android prebuild applied the plugin to MainApplication.kt.
- Native Gradle assembleDebug succeeds for arm64-v8a and separately x86_64. Both APKs install with `adb install -r`, preserving application data. Physical phone runtime verification remains pending unlock.
- Pixel_8 x86_64 emulator successfully loads the welcome, login, partner type selection and partner registration form from localhost Metro on 8084. The app process remains alive and no new fatal exception is recorded. No account was submitted; backend login/registration was not verified.
- An intermediate APK retained only arm64 libraries despite a combined-ABI build. On x86_64 this reproduced SoLoaderDSONotFoundError for libreactnative.so. Removing the generated app/build/intermediates/incremental/packageDebug cache and assembling specifically with `-PreactNativeArchitectures=x86_64 -PreactNativeDevServerPort=8084` produced an APK containing lib/x86_64/libreactnative.so and resolved the emulator failure. Verify APK contents when switching build ABIs.

Hermes/process spawning failed with EPERM inside the agent sandbox; native build/export were verified outside it. This is distinct from the application's reproduced startup crash. No SDK downgrade, dependency upgrade, credential change or application-data reset was performed.
