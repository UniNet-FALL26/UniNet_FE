# Google login: web and Android

## Objective and acceptance
- Enable Google login from the existing login screen on web and Android.
- Obtain a Google ID token, send `{ idToken, role: 0 }` to the existing
  `POST /auth/google`, then save the returned UniNet session through `authStore`.
- Google login is Student-only. Backend rejects non-Student role requests and
  existing Partner/staff accounts before linking Google identity or issuing tokens.
- New Google accounts are always Students. Password login keeps existing roles.
- Successful login follows the same navigation/payment return as password login.
- Cancellation leaves the user signed out without an error; missing configuration,
  SDK/network failures and server rejection have Vietnamese error messages.
- Disable repeated submissions; never log, persist or put Google tokens in URLs.

## Stack and decisions
- Existing Expo/React Native/TypeScript frontend and .NET authentication endpoint.
- Web: Google Identity Services official rendered button and credential callback.
- Android: `react-native-nitro-google-signin` with `react-native-nitro-modules`,
  using Credential Manager and an explicit account selection after a user action.
- Use `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, also approved by backend
  `Google__ClientIds__0`. Client IDs are public configuration, not client secrets.
- Android OAuth registration must match `com.uninet.mobile` and signing SHA-1.
  Native dependency changes require rebuilding Android; Expo Go is unsupported.
- Preserve existing session storage, password login and unrelated changes.
- Add a backend Google token-verification boundary so tests can supply verified
  claims without bypassing production signature/audience validation.

## Structure and style
- Provider adapters/component under `src/components/auth` or `src/services`;
  API call in `src/services/auth.service.ts`; session handling in `useAuth`.
- Platform-specific `.web.tsx` / `.native.tsx` files prevent native imports on web.
- Follow existing typed functions and named exports, for example
  `apiRequest<LoginResponse>('/auth/google', { method: 'POST', body: ... })`.
- Behavioral tests in `tests/google-login.test.cjs`; setup and verification
  results in `docs/handoffs/google-login.md` after implementation.

## Ordered implementation plan
1. Test and implement Google token exchange/session handling, including cancellation,
   invalid credentials and server rejection. Verify targeted auth regression tests.
2. Add web/Android providers and config plugin/dependencies; connect loading,
   error handling and successful navigation to the existing form. Verify lint/types.
3. Verify web runtime with mocked Google/backend boundaries, document Google Cloud
   setup and the limits of verification without real OAuth registration/device.
   Fix the auth desktop hydration mismatch reproduced by these browser checks.

## Commands and testing
- `node -e "require('./tests/google-login.test.cjs'); require('./tests/student-registration.test.cjs')"`
- `node --test tests/refresh-token.test.cjs`
- `npx tsc --noEmit`
- `npx eslint src/services/auth.service.ts src/hooks/useAuth.ts src/components/auth`
- `npx expo export --platform web --output-dir <temporary-output>`
- `npx expo run:android` after OAuth/SHA configuration for native acceptance.
- `node tests/google-login-browser-check.cjs` against a web export built with the
  fixture environment described in the handoff.
- Tests mock external Google/provider responses; backend verifies real ID tokens.
  Real account consent is completed by the user, never by reading credentials.

## Boundaries and approval
- Always: focused changes, tests before behavior changes, no credential logging.
- Approval required: this plan and the two Android native dependencies.
- Never: change database schema, embed OAuth secrets, alter unrelated files,
  claim real Google/Android end-to-end success from mocks.
- Approved by user; user additionally requires Student-only Google login.
- Pending deployment configuration: Google OAuth client ID, web origins and SHA.

## Sources
- https://docs.expo.dev/guides/google-authentication/
- https://developers.google.com/identity/gsi/web/guides/display-button
- https://react-native-nitro-google-sign-in.github.io/docs/getting-started/installation/
- https://react-native-nitro-google-sign-in.github.io/docs/guide/usage/
