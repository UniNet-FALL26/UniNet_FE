# GitHub Integration — Project Settings and Members

> Runtime correction (2026-11-22): the Backend launcher subsequently proved to retain the original E2E database despite its old receipt label. It has been fixed; API PID is now **13820**, verified against API-issued session persistence in **uninet_github_fe_e2e_20261121**. The earlier live-read database-target assertion in this report is superseded. Browser fixture/unit results remain valid. Current manual fixtures, credentials and incident disclosure: [Backend manual-test handoff](../../../UniNet_BE/docs/agent-handoff/UNINET_GITHUB_FE_MANUAL_TEST_READY.md). Expo remains on 8081; its configuration/code was not changed by the seed task.

## Repository access and linking improvement — current, 2026-11-22

### Root cause established

- Repository choices were already fetched from `/projects/{projectId}/git/app/installations/{installationId}/repositories?credentialId=...&page=...`, not from Project B's associations. No first repository/installation was automatically selected. Existing repository pagination had next/previous controls; there was no Backend rule requiring All repositories.
- Missing FE steps: credentials appeared before an explicit GitHub account choice; no account-to-credential actor-ID scoping in the dialog; no Configure action; no scoped revalidation/refresh after a GitHub permission change. A retained modal page/selection could therefore stay stale until the user reselected an installation.
- Backend `GitHubAppGrantService` already calls the user-token GitHub provider on every discovery, revalidates installation visibility and updates observed repository grants. It does not need a worker for ordinary newly granted repository discovery. It intentionally rejects VerificationUnknown/suspended/unavailable authorization; this change does not bypass those policies.
- GitHub's installation response already contains `html_url`; the provider/DTO discarded it. This was verified against [official REST documentation](https://docs.github.com/en/rest/apps/installations#list-app-installations-accessible-to-the-user-access-token), then the actual live Backend response after the minimal change.

### Implemented flow

1. Account picker shows the caller's verified accounts, avatar/status, and **Liên kết tài khoản GitHub khác**. Nothing is preselected. Selecting an account resets all credential/installation/repository/authorization selection.
2. Credentials are scoped by exact verified numeric provider account ID, never login or array order. Only a chosen matching credential can load installations. Expired credentials have an explicit reauthorization state. Existing App authorization start/return/recheck is reused; no new OAuth mechanism.
3. Only the chosen installation's repository discovery supplies choices. Current-project association IDs only annotate/disable already-linked rows. A repository linked to another project remains selectable when authorized; that other project's association is not used as a choice source or modified.
4. **Cấp quyền thêm repository** opens the selected installation's provider-supplied `configurationUrl`. Both BE and FE validate HTTPS github.com, no credentials/query/fragment, and a settings path whose installation ID matches. No per-installation URL is synthesized. Missing/invalid URLs fall back to `https://github.com/settings/installations` with explicit owner/installation guidance, including organization settings.
5. UI explains **Only select repositories**, one or multiple selections, Save, then manual return. It does not require All repositories. The official procedure is documented by [GitHub](https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps).
6. Opening Configure invalidates the repository choice and disables confirmation until refresh. **Tôi đã cấp quyền — Tải lại danh sách** fetches current credentials, finds the same selected installation across pages, fetches fresh repository page 1, and refreshes only current-project linked markers. No cache is reused (`cache: no-store`); no fallback to a first credential/installation. A removed/replaced authorization fails closed. All returned repository pages remain available through next/previous controls; a missing repository does not become a fabricated choice.
7. Confirmation displays project/account/installation/repository and eligibility. Only explicit **Xác nhận liên kết** invokes one repository-link API. Granting GitHub permission, refreshing, changing account or visiting a callback does not link anything.

### Backend contract change (no endpoint/schema)

Optional nullable `configurationUrl` was appended to `GitHubAppInstallationItem` and the provider installation DTO. `GitHubAppUserClient` reads it from installation-level `html_url`, sanitizes it, and `GitHubAppGrantService` passes it through. Existing constructor calls/clients remain compatible; no column, migration, stored evidence or grant-generation policy changed.

Backend production files: `UniNet.Application/Interfaces/IGitHubAppUserClient.cs`, `UniNet.Application/DTOs/GitHubAppGrantContracts.cs`, `UniNet.API/Services/GitHubAppUserClient.cs`, `UniNet.Application/Services/GitHubAppGrantService.cs`. Unit tests added in GitHubAppUserClientTests and GitHubAppGrantServiceTests.

### Separate reproduced FE auth defect fixed

A deterministic test first produced **2 failures**: GitHub authorization 401 responses were treated as expired UniNet JWTs by the shared API client. JSON and multipart requests now distinguish GitHub-coded 401s on GitHub routes, preserve the UniNet session, and let the UI request App reauthorization. Ordinary JWT 401 still uses the existing bounded refresh; an upstream GitHub 401 after a successful refresh also preserves the rotated session. No general authorization policy was relaxed.

### Current verification

- FE focused: **57 PASS / 0 FAIL / 0 SKIP**, including account/credential isolation, URL validation/fallback, refresh across installation pages, authorization replacement/revocation and provider-401 vs UniNet-refresh tests. Run `npm run test:project-github`.
- Real Chrome UI fixtures: **22 scenarios PASS**, 0 uncaught page errors. Expanded checks cover two account choices, matched credentials, correct direct Configure URL, no link on permission change, fresh page-2 repository after refresh, already-linked/admin-ineligible choices disabled, scope reset on account change, and authorization expiry without logout. All API mutations and GitHub settings navigation are intercepted; this is **not a live GitHub permission-change claim**. Updated screenshots inspected at mobile/desktop widths.
- Backend focused: **48 PASS / 0 FAIL / 0 SKIP**, including 8 URL validation cases and read-through/pagination regression using provider + SQLite fixtures; no claim of new PostgreSQL concurrency coverage.
- Lint for changed feature/API files: PASS. Full TypeScript remains at the same **13 existing errors** in opportunities and AssessorProfilePosts; no new GitHub/API type errors. The historical unrelated refresh-token VM-harness failures noted below were not rerun or counted in this feature's passing totals.
- API build/startup PASS; EF model has no pending changes, 104 applied / 0 pending. No migration was run.
- Live GitHub-backed Backend reads: A installations **200**, **1** installation, configuration URL **https://github.com/settings/installations/181414567** returned by the provider; repository discovery **200**, **2 eligible**, HasMore=false. A/C manager reads **200**, B **403**. Real API-issued sessions for all three personas were independently verified in the permitted FE database.
- Preservation: exact before/after fingerprints match for **19 tables** covering immutable evidence/observations/snapshots/runs, project associations/history/identities/memberships/manager grants, jobs/checkpoints and EF history. Discovery legitimately updates installation/grant verification metadata; no scoring/evidence/association mutation occurred. Project A remains unlinked; Project B unchanged.

### Runtime and manual test

Backend was restarted only after verifying worker-off FE target, zero active jobs, listener/process identity and successful isolated build/tests. Current API **PID 13820**, parent **2104**, health 200; all workers OFF; actual FE target proven via session persistence. Expo **PID 7644**, http://localhost:8081, unchanged. Logs `%LOCALAPPDATA%/UniNetGitHubFrontendE2E-runtime/repository-access.out.log` and `.err.log`.

Open Project A Settings: `http://localhost:8081/group/44b9e967-a830-4061-b33b-5d96ca41df07?tab=settings`.
Log in as A, select verified account -> matching App credential -> installation -> **Cấp quyền thêm repository**. On GitHub use an approved E2E test repository, Only select repositories, Save. Return, refresh, navigate pages if necessary, select exactly one repository, inspect confirmation, then confirm yourself. Do not remove access to Project B's existing test repository. C can exercise delegated management with C's own verified/authorized GitHub account; B cannot manage repositories.

**Not performed:** user OAuth consent, editing GitHub access, granting a second live repository, linking a live repository, sync, finalization, reseed/reset, migration, original-database access, Neon/production, commit/push. The provider callback settings still require administrator confirmation for fresh consent; existing credential discovery already works. VerificationUnknown remains a separate fail-closed state requiring the existing reconciliation policy rather than an automatic bypass.

### FE files changed in this improvement

[Link dialog](../../src/components/projects/github/GitRepositoryLinkDialog.tsx), [repository panel](../../src/components/projects/github/ProjectGitRepositoryPanel.tsx), [account picker](../../src/components/projects/github/GitHubAccountPicker.tsx), [callback screen](../../src/components/projects/github/GitHubCallbackScreen.tsx), [Git service](../../src/services/project-github.service.ts), [API client](../../src/services/api.ts), [types](../../src/types/project-github.ts), [access helpers](../../src/utils/github-repository-access.ts), [error labels](../../src/utils/project-github.ts), [access tests](../../tests/github-repository-access.test.cjs), [provider-auth tests](../../tests/github-provider-auth.test.cjs), [browser test](../../tests/project-github-browser-check.cjs), [contract tests](../../tests/project-github.test.cjs), package test command and this report. Existing uncommitted work retained.

---

## Initial Phase 1 implementation (historical)

Implemented 2026-11-22. No GitHub tab; existing UniNet project navigation and shared Hub components are retained.

## Implementation map

- [ProjectSettingsPanel](../../src/components/projects/hub/ProjectSettingsPanel.tsx) includes [ProjectGitRepositoryPanel](../../src/components/projects/github/ProjectGitRepositoryPanel.tsx).
- [ProjectHubDetailScreen](../../src/components/projects/hub/ProjectHubDetailScreen.tsx) keeps its existing Members panel and delegates rows to [ProjectGitMemberRows](../../src/components/projects/github/ProjectGitMemberRows.tsx). Creator inclusion and self-first order still use the existing projectDisplayMembers utility.
- [GitRepositoryLinkDialog](../../src/components/projects/github/GitRepositoryLinkDialog.tsx) implements credential -> installation -> repository -> explicit confirmation, plus paginated discovery and explicit authorization recheck.
- [GitHubAccountPicker](../../src/components/projects/github/GitHubAccountPicker.tsx) lists caller-owned OAuth connections and supports initiating verified account linking.
- [project-github.service](../../src/services/project-github.service.ts) and [types](../../src/types/project-github.ts) use the existing apiRequest client, bearer storage, refresh handling and safe error codes. No alternate authentication client or provider token storage.
- [OAuth callback route](../../src/app/github/callback.tsx) renders [GitHubCallbackScreen](../../src/components/projects/github/GitHubCallbackScreen.tsx).
- [github-oauth](../../src/utils/github-oauth.ts) persists only expiring flow metadata: flowId, initiating UniNet account, project and return tab. Web uses tab-scoped sessionStorage; native uses existing SecureStore dependency. No GitHub token, secret or authorization code is persisted.
- [project-github utilities](../../src/utils/project-github.ts) provide Vietnamese state/error labels, profile-ID-based identity selection and strict Published-result display checks.

## Local execution

```powershell
cd D:/uninet/UniNet_FE
npm run web:github-e2e
```

[The launcher](../../scripts/start-github-frontend-e2e.cjs) supplies `EXPO_PUBLIC_API_URL=http://localhost:5239/api` only to its Expo child. The regular FE environment still points to Render and was not edited. Default npm web/start scripts retain their behavior. Do not start a second Expo copy while 8081 is already occupied.

At verification: Expo listener PID **7644**, launcher **9940**, `http://localhost:8081`; existing Backend PID **2120**, `http://localhost:5239`. Both left running. Recheck ownership before stopping a recorded PID. Backend workers remain OFF. Backend was not restarted or reconfigured.

## Contracts and permissions

OAuth: `/github/oauth/start` -> GitHub -> Backend callback -> FE `/github/callback?githubFlowId=...&githubStatus=ready` -> `/github/oauth/complete`. The **actual Backend success receipt before completion is `ready`**, not `completed`. Callback refuses missing/expired metadata, mismatched flow or a different UniNet account. OAuth does not itself create a project identity: the verified connection must be selected explicitly afterward.

OAuth return target defaults: `expoWeb` for web, `expoNative` for native. The Backend allowlist maps these to localhost:8081/github/callback and uninet://github/callback. Generic Expo Go does not necessarily support the app's custom native scheme; use an appropriate dev build or an explicitly configured allowed target. `EXPO_PUBLIC_GITHUB_OAUTH_RETURN_TARGET` can select an already configured target; FE does not alter the Backend allowlist.

App start uses `/projects/{project}/git/app/authorization/start` with the caller's own OAuth connection. It defaults to return-target key `e2e` (`EXPO_PUBLIC_GITHUB_APP_RETURN_TARGET` can select an existing configured target). A separate explicit user-gesture button opens the returned GitHub URL to avoid popup blocking after an awaited request. The user returns and invokes **Kiểm tra quyền App**; actual Backend credentials must then exist before discovery/link. There is **no App completion POST**.

Manager capability is derived from the Backend's manager-protected App credential read: 200 permits the controls; 403 hides them. It is not inferred from a role label, guessed Leader status, or an OAuth connection's existence. The Backend remains authoritative for every mutation. Ordinary members can read authorized association information but cannot select/unlink repositories through this UI.

Only the current profile's row offers identity linking/reactivation/unlink. The request sends a verified connection ID, never a target member/username. Active/inactive project identity remains distinct from the underlying OAuth connection. Ownership conflict is shown explicitly; no transfer or leader verification on someone else's behalf.

Repositories display full name, privacy, access state, sync/readiness state and retained unlink history if returned by Backend. A sync-status request failure is shown as unavailable, not as a completed or absent sync. No sync endpoint is invoked by this feature.

## Official Contribution visibility

Only `GET /projects/{project}/contribution/v2/results/me` supplies a score. Response must be contract 1, match project/profile, have a valid PublishedAt, and contain a finite 0–100 contributionPercent. A legitimate published zero is displayed; missing/ineligible data never becomes zero. No commit counts, Draft/Experimental runs, normalization or scoring formulas are calculated in FE.

The current API provides an authorized **own published result**, not a general member leaderboard. Other rows retain **Chưa có điểm** rather than using a privileged run-detail endpoint to disclose scores. Showing other members' percentages requires an explicit Backend-authorized published roster read contract; it is not a reason to expose Draft calculations.

Current E2E project's official results/me returns **409** (both students). UI shows unavailable/no published score. Existing experimental results are deliberately not substituted.

## Verification

### Automated

`npm run test:project-github`: **48 PASS / 0 FAIL / 0 SKIP**, including 8 new GitHub contract/security tests plus existing project membership, routing, project service and API feedback tests. Repeated executions are not additional tests.

[Browser fixture script](../../tests/project-github-browser-check.cjs): **16 PASS** scenarios in real headless Chrome with the actual Expo bundle. Every API call is intercepted, and its origin must be localhost:5239; no fixture write reaches E2E. Covers repository read/status, App start contract, credential/installation/repository selection and link confirmation, identity reads/self-link, conflict rejection and recovery, Creator/Manager/Member controls, loading/empty/error states, own published score vs hidden other scores, unavailable official scores, OAuth flow mismatch rejection, successful ready receipt completion, no App completion call. Screenshots inspected at 1440px and 390px; overflow checked at 320px too. No uncaught page errors. Native device execution is NOT TESTED.

Reproduce browser checks with an available Playwright installation and installed Chrome:

```powershell
$env:PLAYWRIGHT_MODULE = '<absolute path to playwright package>'
node tests/project-github-browser-check.cjs
```

No Playwright dependency was added to production packages. This session installed the runner only under the agent's temporary tool directory. Screenshots: `%TEMP%/uninet-github-ui/` (fixture data only, not live members).

Focused ESLint for all new TypeScript files: **PASS, 0 errors/warnings**.

Full `npx tsc --noEmit`: **13 pre-existing errors**, all in [opportunities](../../src/app/(tabs)/opportunities.tsx) and [AssessorProfilePosts](../../src/components/assessor/AssessorProfilePosts.tsx). A compiler-host comparison using the original HEAD versions of edited shared files and excluding new feature files also reports exactly 13 errors in those two files. No GitHub or changed shared-file type errors. Earlier stale generated Expo route errors disappeared after normal Expo route generation; no unrelated routes were edited to silence errors.

An additional existing `refresh-token.test.cjs` run has **25 FAIL** at test setup: its VM loader tries to read nonexistent `src/react-native.ts` instead of mocking React Native. This suite/source was not changed. Reported separately from the 48 passing focused tests; it was not counted as skipped or claimed passing.

### Real local Backend read verification

- `/health` **200**; existing instance reused.
- Student A/B: official login and auth/me **200** (correct identities), connections **200**, repository/identity lists **200**, sync status **200**. Pagination response shapes checked.
- App credentials: A **200**, B **403**, matching Creator vs ordinary-member controls.
- Official results/me: A/B **409**; no score fabricated.
- Protected DPAPI credentials were used in-memory only; no password/JWT/refresh token printed or saved by verification. Session writes from login are expected in the FE clone.
- Verified database: `uninet_github_fe_e2e_20261121`, 24 Git jobs, 102 versions, 693 observations, 5 snapshots, 4 runs, unchanged from preparation counts.
- Browser mutation tests used intercepted fixtures. No live OAuth authorization, repository/identity mutation, Git sync, snapshot, cohort, rating, run or finalization. No Backend config/migration, original E2E database, Neon/production or GitHub settings changes.
- `git diff --check`: PASS.

## Remaining external prerequisites

1. Saved provider OAuth/App callback settings must be verified by the administrator. Reachable Backend paths and a valid App key do not prove the full consent round trip. No real user OAuth consent was performed.
2. App return target `e2e` currently points at Backend Swagger. A verified HTTPS FE return target is needed for an automatic App-to-FE callback; keep Backend HTTPS validation intact. Manual return and credential recheck are implemented without assuming success.
3. Native scheme callback and native screens need a real dev-build/device check. Web/mobile viewport tests are not a native-device claim.
4. Other members' official percentages need an authorized published roster result contract if that display is desired. Current own-result privacy is preserved.
5. Existing TypeScript/test-harness problems above are unrelated baseline issues. Node 22.12 in this machine also emits engine warnings against installed SDK dependencies; an SDK-compatible Node version is advisable for subsequent native work. No global runtime was changed.

No commit/push. UI/API integration is implemented; live provider authorization E2E remains conditional on provider callback settings and real user consent.

## 2026-11-23 — Link-status audit and simplified linking UX (current behavior)

This section supersedes the older manual-refresh UX and runtime observations above.

### Actual repository state (read-only audit)

- Verified FE database: `127.0.0.1:55433/uninet_github_fe_e2e_20261121`, container `uninet-step2-concurrency`, role `uninet_test`. Neither root `.env` nor Neon/original E2E was used.
- Project A `44b9e967-a830-4061-b33b-5d96ca41df07` owns the newly saved association `38135f80-f18e-48c9-a9f4-df73fe268d92`, linked at `2026-11-23T01:37:00.573788Z` to `trangtanduoc/uninet-github-app-e2e`. UnlinkedAt is null: **the repository link is saved**. AccessStatus is PendingAuthorization, SyncPaused is true, readiness is PendingActivation. It is not yet activated for sync; no jobs exist for this association.
- Project B `68f98a9f-d73d-4dcf-be5c-7099b29329c0` has its separate association `25fe740d-dfbf-4859-8ce1-257247b4b3e7`. Matching provider repository IDs do not merge associations or project state.
- Installation `181414567` is locally Active, VerificationUnknown=false; the repository grant is not revoked. Provider read-only GET `/user` returned 200 and matched the credential's numeric actor ID. GET `/user/installations/181414567/repositories` returned 200 and included repository ID `1446877283`, with read and admin permission. No consent or permission changes were performed. This proves access at the audit time, not perpetual access or sync completion.
- Source explanation: `GitHubAppRepositoryLinkService` saves PendingAuthorization + SyncPaused, then attempts activation. `GitHubAppRepositoryActivationService.ActivateAsync` returns false while GitHubSync.Enabled=false. Thus a valid provider grant and persisted link can coexist with PendingActivation in worker-off E2E. Revalidation does not bypass this activation policy.
- Association persisted, provider authorization, local activation, sync execution, evidence completeness and Contribution readiness are distinct. No UI status claims Contribution readiness from an Active association or a Completed job.

### Current UX

- Settings keeps one primary action: **Liên kết GitHub Repository** when empty, **Thêm repository** when linked. Repository rows show privacy, saved-link state, authorization and sync separately. Raw readiness is available only under the three-dot menu's **Chi tiết trạng thái**.
- Unlink is in that menu, followed by a separate confirmation explaining retained history. No live unlink was performed.
- The wizard requires explicit GitHub-account and repository selection, then one **Xác nhận liên kết** step showing the destination project. Existing accounts and repositories are never automatically selected. Only an unambiguous single credential/Active installation is resolved automatically after account selection; multiple choices retain their controls.
- Routine load/reload, credential-confirmation and App-permission-recheck buttons are removed. App authorization opens GitHub from the user gesture; a second open button exists only if popup opening fails. Retry appears for error/timeout. Repository pagination remains explicit.
- Configure can return to Swagger in this E2E environment. Users still perform GitHub consent/permission selection and return to UniNet themselves; the UI then rechecks automatically. No Backend HTTPS return-target validation or GitHub settings were changed. Full provider callback consent E2E remains unverified.

### Automatic revalidation and race protection

[useGitHubRevalidation](../../src/hooks/useGitHubRevalidation.ts) handles navigation focus, web window focus/visibility, native AppState foreground, project/account scope changes, OAuth success notification, and panel remount after link/unlink. Returning from OAuth preserves the requested Settings/Members tab rather than resetting it to Overview.

[Refresh engine](../../src/utils/github-refresh.ts) permits one in-flight read per scope, coalesces focus/visibility events within 1.5 seconds, aborts superseded reads, and ignores late responses. Changing account, installation or page creates a new scope. Requests have a 20-second timeout. Waiting for GitHub permission has a 90-second wall deadline and at most five reads, with 2/5/10/20/30-second backoff. Permission changes stop waiting; closing/unmounting cancels it; inactive apps pause requests. Timeout never becomes authorization success. Foreground still performs a normal revalidation after a waiting deadline expires. Permanent permission denial stops automatic waiting.

Fresh reads concern the selected installation and repository page; other repository pages are fetched when selected. There is no unlimited polling or background sync. GitHub tokens remain server-side.

### Verification and preservation

- Focused tests: **67 PASS / 0 FAIL / 0 SKIP**, including refresh bounds/abort/coalescing, independent statuses, scope selection, API contracts and permission handling. Repeated runs are not added to the count.
- Real Chrome with actual Expo bundle: **16 PASS / 0 FAIL** fixture scenarios. Every API request/mutation and GitHub navigation is intercepted. Covers independent statuses/menu confirmation, permission return, explicit linking, pagination, stale response after account change, App authorization return, member/manager controls, identity conflict, error recovery and OAuth return. No real DB write or consent is made by these tests. Screenshots checked on desktop and mobile-width Web; no uncaught page errors. Native device behavior is **NOT TESTED**; native foreground uses AppState in source.
- Focused ESLint: **0 errors**; two existing exhaustive-deps warnings in the shared ProjectHubDetailScreen remain. Full TypeScript: **FAIL with 13 baseline errors**, confined to opportunities.tsx and AssessorProfilePosts.tsx; no errors in the GitHub feature or changed project screen.
- `/health` is 200. Existing API PID **13820** and Expo PID **7644** reused; no restart or Backend configuration/source change in this task. Expo serves changed FE source through its existing development server.
- Protected before/after fingerprints for 19 Git/project/membership/identity/Contribution/migration tables match exactly. Counts remain 104 migrations, 24 jobs, 102 versions, 693 observations, 5 snapshots and 4 runs. User-created Project A link is included in this task's baseline; Project B is unchanged.
- No live login/session mutation, sync, migration, identity mutation, snapshot/run/cohort creation, finalization, GitHub settings change or worker activation. No commit/push.

Remaining limits: actual GitHub Developer Settings callbacks still need administrator confirmation; a secure allowed HTTPS FE App return target is required for automatic App redirect instead of Swagger. Native physical-device verification and unrelated baseline TypeScript repairs remain separate work. No Backend change or restart is required for this UX update.

## Official Contribution dashboard — 2026-11-23
Project Detail now has a **Đóng góp** tab (not a GitHub tab). GitHub Settings and member Git Identity remain unchanged. See [Official Contribution V2](./project-contribution-v2.md) for contracts, privacy, confirmations, mutation recovery and test results. No live Contribution mutation was performed during implementation.


## Production UI cleanup — 2026-11-23
Repository cards retain names/privacy, separate connection/authorization/sync states, reliable successful-sync time and authorized add/menu actions. Status detail is user-readable; no association/installation/job IDs, raw readiness enum or provider payload rendered. Account/installation choice remains explicit and all callbacks/permission checks/confirmations unchanged. User copy avoids OAuth/worker/E2E implementation details.

Members uses verified username once, Vietnamese role, Published % and own GitHub management disclosure. No third-party private identities/evaluations are newly disclosed. Developer metadata stays in authorized tools; no Debug tab or auth-bypassing dev flag. Account/repository fixture16casesPASS; related units67PASS. No real linking/unlinking/provider consent in live cleanup verification. [Audit/screenshots/handoff](../../../UniNet_BE/docs/agent-handoff/UNINET_GITHUB_CONTRIBUTION_PRODUCTION_UI_CLEANUP_20261123.md).

## Multiple GitHub identities — 2026-11-24

One project member may own multiple verified GitHub accounts. Members now renders every active identity permitted by the existing project access policy, in stable username/identity order. Identity ownership remains project-scoped, without a repository-specific owner mapping. Published Contribution still renders one result per UniNet member.

- **Liên kết tài khoản GitHub khác** opens the existing account picker even when an identity is already active. Already-linked accounts are labelled, without an actionable duplicate link button. A new account must complete the existing OAuth flow before selection.
- **Quản lý GitHub của tôi** exposes a separate **Ngắt liên kết @username** action for each own active identity. Confirmation names the selected account; other identities remain linked. Inactive identities can be reactivated by selecting the matching verified account in the picker. Numeric actor matching, not login matching, selects the prior identity.
- All identity pages are fetched. Project/account changes remount local state; aborted/stale reads cannot replace the current collection. Focus/foreground/navigation refresh reuses the bounded GitHub revalidation mechanism. Timeout hides stale identities and offers retry. Errors never become successful linking states.
- Account IDs, actor IDs, identity IDs, tokens and private OAuth fields are not rendered. Project outsiders retain the existing Published-percent access but gain no Git identity access. Creator/Leader cannot manage another member's identity through these controls.
- Linking changes neither frozen snapshots nor Published results. Use the existing Git + Peer Adjustment workflow to capture newly eligible attribution in a new reviewed/published Run. No scoring, ownership, authorization or schema change is introduced.

Verification: 68 GitHub unit tests and 53 Contribution unit tests PASS. Browser fixtures exercise real Expo UI with every API write/provider navigation intercepted, including second-account linking, conflict, per-account unlink/reactivation, reload, project/session switching and mobile layout. Backend PostgreSQL tests cover real identity service mutations and two actors/two repositories producing a single Official Draft result with frozen attribution. Full TypeScript retains 13 baseline errors outside this feature. Live E2E verification was read-only; real multi-account OAuth/link/unlink awaits explicit account-specific approval.
