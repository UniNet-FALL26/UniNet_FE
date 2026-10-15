# Native editor entry crash

Device ReactNativeJS logs showed `Property 'document' doesn't exist` when opening the editor. React Native 0.86 Text refs can implement DOM-compatible Element/parentElement APIs without providing browser `document`. The old Element-only condition therefore entered the web Range code on Android.

`ProfileEditContext.EditField` now gates browser measurement on `Platform.OS === 'web'` and available document/Element globals. Native measurement uses text line/layout events. Callbacks are stable, identical coordinates retain the previous state, and invalid coordinates are ignored; repeated layout events cannot trigger redundant pencil updates.

Regression `tests/profile-edit-layout.test.cjs` reproduces the native Element-without-document crash (failed before fix), checks stable callbacks and verifies repeated identical events cause one update. TypeScript and all 69 FE tests pass. Modern, Showcase and Landscape editor screens were inspected on the attached Android device without changing or saving profile data.

Earlier device logs also showed missing `ExponentImagePicker`; its APK predated the newly installed dependency. Rebuild the Android client to include this native module; hot reload alone cannot add native modules. Build/test completion recorded below.

Android `:app:assembleDebug` completed successfully. Installed `app-debug.apk` with `adb install -r` on the attached device, preserving app data, and reopened the app. The updated client opens the Modern editor; no document/ImagePicker/maximum-update errors appear in the new process log. No profile edits or saves were performed. Debug APK remains under ignored `android/app/build/outputs/apk/debug`.
