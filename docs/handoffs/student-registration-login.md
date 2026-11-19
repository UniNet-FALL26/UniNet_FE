# Student registration → manual login — 2026-11-01

Email/password student registration no longer establishes a frontend session or enters protected tabs. `useAuth.register` discards the existing registration response without calling `authStore.setAuth`. `RegisterForm` replaces registration with login using `registered=1`; `LoginForm` displays an accessible, persistent success notice. Only explicit login saves the session. Error responses remain on registration for correction/retry.

Partner registration, Google authentication, account creation APIs and existing login/payment-return routing were preserved. Backend still returns its existing registration response; this change does not alter the API contract or server token issuance. No returned registration credentials are stored by this flow.

Verification: 11 focused registration/route-guard tests passed; TypeScript and web export passed. Isolated mocked Chrome check at 390/1440px verifies failed registration/retry, success notice, no login or `/auth/me` request after registration, protected-route denial, no restored session after reload, then explicit login succeeds. Screenshots in ignored `dist/student-registration-check/`. Existing static auth hydration #418 is reported separately; no other browser runtime errors observed. No real accounts were created.

Commands from FE:
```powershell
node --test tests/student-registration.test.cjs tests/auth-route-guards.test.cjs
npx tsc --noEmit
npx expo export --platform web --output-dir dist/student-register-web
node tests/student-registration-browser-check.cjs
```
Browser test uses `http://127.0.0.1:8106` by default, overridable through `REGISTRATION_TEST_ORIGIN`, and requires an extensionless static route server. Temporary helper: ignored `dist/student-register-preview.py`.
