# Logout

## Objective and acceptance
- Settings exposes an accessible logout button to every authenticated role, even when profile loading fails.
- Logout immediately removes the in-memory access/refresh tokens, account and session; works offline.
- Reset the screen tree to discard component-held user data and drafts; navigate to login.
- Requests completing after logout/account change cannot return previous-session data or restore authentication.
- Account records and saved portfolios on the server remain intact.

## Plan
1. Add regression tests for session cleanup and late successful API responses.
2. Implement local logout and reject responses from obsolete sessions.
3. Add settings action and reset the root Stack when the authenticated account changes.
4. Run Node tests, TypeScript and browser login/logout checks.

## Commands and structure
- Tests: `node -e "require('./tests/refresh-token.test.cjs')"`
- Types: `node_modules/.bin/tsc --noEmit`
- Web: `node_modules/.bin/expo start --web --port 8083`
- Sources: `src/services/auth.service.ts`, `src/services/api.ts`, `src/hooks/useAuth.ts`, `src/app/settings.tsx`, `src/app/_layout.tsx`.
- Tests: existing Node test/VM loader; browser checks under `tests/`.

## Conventions and boundaries
Use existing async service/store methods and accessible Button components, e.g. `logout: () => tokenStorage.clear()` with a void result.
Always test token cleanup and account-switch races. No new dependencies, plaintext credential persistence, backend deletion, or unrelated route fixes.
