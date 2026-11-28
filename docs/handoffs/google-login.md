# Google login — Student only

## Behavior
- Web uses the official Google Identity Services button; Android uses explicit
  account selection through Credential Manager (`react-native-nitro-google-signin`
  and `react-native-nitro-modules`). Native code loads on interaction.
- Both exchange the Google ID token at `POST /api/auth/google` with `role: 0`
  and the existing messaging device ID, then store the UniNet session normally.
- Backend rejects non-Student requests and existing Partner/staff identities
  before linking or issuing tokens. FE also rejects non-Student responses.
- Login preserves payment-return navigation. Google registration creates/signs
  in a Student; its button requires accepting the existing terms checkbox.
- Cancellation keeps the form usable. SDK loading can be retried. Duplicate
  callbacks cannot exchange twice. No OAuth client secret belongs in this app.
- Desktop auth now matches the server-rendered mobile tree during initial
  hydration before applying the desktop transition.

## Required Google Cloud configuration
1. In a Google Cloud project, configure Google Auth Platform branding/audience.
   If the app is in testing, add the intended test accounts.
2. Create an OAuth client of type **Web application**. Add exact frontend origins
   under **Authorized JavaScript origins**, including scheme and port for local
   development (e.g. `http://localhost:8081`). Add deployed HTTPS origins separately.
   GIS uses popup credential callbacks here; no application redirect route is used.
3. In `UniNet_FE/.env`, set:
   ```dotenv
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
   ```
   In `UniNet_BE/.env` or deployment environment, set the same audience:
   ```dotenv
   Google__ClientIds__0=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
   ```
   Preserve `EXPO_PUBLIC_API_URL` and existing approved API CORS origins.
4. Create an **Android** OAuth client in the same Google Cloud project with package
   `com.uninet.mobile` and the signing certificate's SHA-1. Register each signing
   identity used: debug, distribution/EAS, and Play app signing as applicable.
   `android/gradlew.bat signingReport` lists local fingerprints from the FE root.
5. Restart/rebuild web after changing Expo public env variables. Rebuild Android
   with `npx expo run:android`, or the existing EAS build workflow. Expo Go does
   not include the native modules. On Android an explicit Web client ID works
   without Firebase auth; existing Google Services files activate the config plugin.

Ship the Student-only backend change together with the frontend. Removing files
or adding frontend checks alone cannot restrict the previously deployed endpoint.

## Verification
- Results: 13 focused FE tests, 35 backend auth tests, all 8 Chrome fixture cases
  passed. Web and Android JavaScript exports and native dependency compatibility
  validation succeeded. Android native APK compilation/device sign-in is unverified.
- Focused FE behavioral tests: `node -e "require('./tests/google-login.test.cjs'); require('./tests/student-registration.test.cjs')"`.
- Backend: `dotnet test UniNet.Tests/UniNet.Tests.csproj --no-restore --filter "FullyQualifiedName~GoogleStudentLoginTests|FullyQualifiedName~AuthTests"`.
- Browser fixture export, PowerShell from FE:
  ```powershell
  $env:EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID='000000000000-uninet-test.apps.googleusercontent.com'
  $env:EXPO_PUBLIC_API_URL='http://127.0.0.1:8187/api'
  npx expo export --platform web --output-dir .expo/google-login-check --max-workers 2
  node tests/google-login-browser-check.cjs
  ```
  This fixture ID is deliberately unusable for real OAuth. Use a separate shell
  from development builds; the browser test intercepts Google and API responses.
- Browser checks cover success/payment return, Student-only denial, cancellation,
  SDK-load retry and duplicate callbacks at 375/1440px, with zero page exceptions.
- Lint the changed auth/provider files; validate native dependency compatibility
  with `node node_modules/react-native-nitro-google-signin/scripts/validate-compatibility.js`.
- Full `tsc --noEmit` currently reports unrelated errors in `opportunities.tsx`
  and `AssessorProfilePosts.tsx`. No Google login files have TypeScript errors.
- New/changed Google providers, forms, hook, service and app config pass targeted
  ESLint. `DesktopAuthTransition.tsx` has the same 19 ref-rule errors and 2 dependency
  warnings as HEAD (verified against the original source); hydration fix adds none.
- Existing `refresh-token.test.cjs` cannot load its current native messaging imports
  (`src/react-native.ts` missing in its VM loader). Reproduced with the HEAD auth
  service as well; left this test harness unchanged.
- Real Google consent and Android native end-to-end verification still require
  the actual OAuth client registration, signing SHA and a rebuilt device install.
  User-supplied Web client ID is configured in the ignored FE/BE `.env` files.
  Local configuration is not committed; deployment environments need the same ID.

## Official references
- https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
- https://developers.google.com/identity/gsi/web/guides/display-button
- https://docs.expo.dev/guides/google-authentication/
- https://react-native-nitro-google-sign-in.github.io/docs/setup/android/
