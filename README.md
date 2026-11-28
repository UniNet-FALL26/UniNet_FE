# UniNet Mobile

React Native, Expo Router, and TypeScript frontend for UniNet.

## Run

```bash
npm ci
npm start
```

Use `npm run android`, `npm run ios`, or `npm run web` to open a platform. Check types with `npx tsc --noEmit` and bundle all platforms with `npx expo export --platform all --no-bytecode --max-workers 1` if Hermes cannot run in your environment.

## Android APK on Windows

To make a standalone APK locally with Android SDK and JDK installed:

```powershell
npx expo prebuild --platform android --no-install
cd android
.\gradlew.bat assembleRelease --no-daemon
```

The APK is `android/app/build/outputs/apk/release/app-release.apk` relative to the project root. Install and launch it on a connected Android device with:

```powershell
adb install android/app/build/outputs/apk/release/app-release.apk
adb shell am start -n com.uninet.mobile/.MainActivity
```

This preview APK uses the template's debug signing key. It is for direct testing, not Play Store submission. The `preview` profile in `eas.json` can also produce an APK through EAS Build if uploading the repository to Expo is approved.

## Structure

- `src/app/(auth)`: welcome, login, student and partner registration, profile steps, password reset UI.
- `src/app/(tabs)`: existing starter Home/Explore plus prepared section routes.
- `src/components`: shared UI and auth forms.
- `src/services`, `src/store`, `src/hooks`, `src/utils`: API boundary, auth state, and validation.
- `src/constants`, `src/types`: semantic colors, configuration, roles, and auth contracts.

Set `EXPO_PUBLIC_API_URL` in `.env` to the running UniNet API URL ending in `/api`. Email/password authentication, partner registration and profile saving use the backend endpoints. Google login supports Student accounts on web and Android; [Google login setup](docs/handoffs/google-login.md) describes the OAuth configuration and Android rebuild. Password reset email still needs integration. Sessions use the existing platform storage.

Implementation details and verification are in [the auth handoff](docs/handoffs/mobile-auth.md).

Web users can install UniNet from **Cài UniNet** on Welcome or near the bottom of
Settings. Publish the complete `npx expo export --platform web` output over HTTPS
to enable PWA installation; iPhone users receive Add to Home Screen instructions.
See [PWA setup and verification](docs/handoffs/pwa-installation.md).
