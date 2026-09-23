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

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` when the backend is available. The current endpoint paths are provisional. Authentication cannot succeed until the backend contract is connected. Google OAuth, password reset email, partner submission, and profile saving also require backend work. Tokens are currently held in memory only.

Implementation details and verification are in [the auth handoff](docs/handoffs/mobile-auth.md).
