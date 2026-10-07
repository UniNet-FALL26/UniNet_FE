# Refresh token repair

Root cause: setAuth keeps accessToken only; refreshToken is a placeholder; apiRequest throws on 401 without refreshing. Existing POST /api/auth/refresh returns rotating accessToken/refreshToken/expiresAt/account. No new login mechanism or database schema needed.

Plan: reproduce via deterministic mocked-fetch tests, retain token pair together in existing memory storage, synchronize auth store on session changes, implement single in-flight refresh per session and at most one replay of each authenticated request. Never refresh failed login/register/google/refresh requests or 403. Preserve headers/method/body. Terminal refresh 400/401/403 expires only the original session; temporary network/5xx failures keep tokens for retry. Logout/new login while refresh is pending must prevent old responses restoring state. Refresh updates account/accessToken consistently; restoreSession rereads rotated access token. Existing memory-only storage remains, no plaintext persistence or new package.

Backend review: rotation claims old token once; wrap revocation and replacement issuance in one transaction so failed issuance cannot consume a usable refresh token. Add rollback regression test; retain existing one-use/revocation tests.

Verify: Node in-process FE tests (mocked fetch, store, parallel requests, races, failure, replay), npx tsc --noEmit, Expo web export, dotnet test UniNet.Tests and backend build. Never print real tokens or credentials. Handoff records scope and offline/full-integration limits.
