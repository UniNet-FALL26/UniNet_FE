# Official Contribution V2 — Unified Project Dashboard

## Entry and architecture

Project Detail -> **Đóng góp**, heading **Đóng góp dự án**, subtitle **Tổng kết đóng góp của các thành viên**. A member/Creator-only tab in the existing Project Hub; Workspace redirects stay retired. Repository management remains in Settings, Git identity stays in Members. No client scoring engine and no experimental endpoint substitution.

New files:
- `src/types/contribution.ts`: exact Official workflow, snapshot/readiness, cohort, run and audit read models.
- `src/services/contribution.service.ts`: OfficialV2 routes and capture-cutoff history preflight.
- `src/utils/contribution.ts`: human Vietnamese labels, policy reasons, next action/validation.
- `src/utils/contribution-pending.ts`: scoped nonsecret mutation journal (sessionStorage web, SecureStore native).
- `src/components/projects/contribution/ProjectContributionPanel.tsx`: dashboard, details and confirmations.
- `src/components/projects/contribution/useContribution.ts`: authorization-aware load/mutation/readback lifecycle.
- `src/components/projects/contribution/PeerEvaluation.tsx`: own rating forms and revision-aware edits.
- `src/components/projects/contribution/ContributionAudit.tsx`: paginated membership/activity/exclusion/audit detail.
- `src/components/projects/contribution/styles.ts`: existing Hub color tokens, responsive card layout.
- `tests/contribution.test.cjs`, `tests/contribution-browser-check.cjs`.

Changed shared files: ProjectHubDetailScreen (tab/render/accessible labels/query-tab), ProjectHubUI (branch/chart icons only), project-github types (optional own result GitShare/PeerShare), package.json (focused test command). Existing uncommitted GitHub integration retained. No Backend production/API/schema change in this task.

## Dashboard and contracts

Three cards separate Git evidence freeze/readiness, Peer state/progress, and Official result/publication. IDs/hash/enum details are confined to explicit detail views. One primary next action derives from server workflow/run/cohort state; no mutation in effects. Project Active shows completion using existing project flow; mutations requiring completion remain blocked until server says Completed. Non-OfficialV2 workflows do not get creation controls.

All Contribution calls use `/api/projects/{projectId}/contribution/v2`:
- workflow; snapshots create/read/memberships/readiness;
- peer-cohorts create/read, own PUT evaluations, close, peer-snapshots read;
- runs create/read, activities/exclusions/audit, submit/approve/reject/finalize/publish;
- results/me for own Published value.

Creator only fetches private snapshot/readiness/PeerSnapshot/Run detail after workflow.canManage AND project owner/profile checks. Member sessions never request those privileged endpoints, even if workflow metadata incorrectly contains their IDs. Every returned project/snapshot/cohort/run binding is checked. HTTP403 clears the private model. Backend remains authoritative for all permissions/revisions.

Members' forms filter cohort ratings to evaluator=self, even for Creator; third-party ratings/history are not retained in the FE cohort model. No self form, integer 1..5 only, optional comment max2000, expectedRevision from own last returned rating. Closed forms cannot edit. If Backend omits ratings after closure/finalization, UI says content unavailable in this read session rather than showing fabricated values. Student C needs no Git identity for Peer. Roster/required count is read from Backend; roster creation uses active project members plus Creator, with server enforcing the final roster.

Creator workflow: explicit confirm capture/open/close/create/submit/approve/reject/finalize/publish. Reject requires feedback. Run state/revision is from readback. Git and Peer readiness must be Ready (Peer NotApplicable when permitted) before Draft. Review/Finalize/Publish do not run automatically. Member results require a real Published response for own project/profile; privileged Creator result rows are never copied into another member's label.

## Cutoff, refresh and ambiguous requests

Capture preflight reads active identity histories, verifies latest timestamps are valid and not later than device now, then sends current UTC cutoff. Server rejects future cutoff; there is no fixed production date, timestamp backdate, or automatic capture/re-capture. Snapshot/capture contract has no idempotency key: after an ambiguous response FE reconciles latest workflow ID and **does not blind retry**. If no new server ID can be confirmed, pending metadata blocks another capture/cohort creation; an operator must inspect server state. This is deliberately safer than creating duplicate immutable records.

Run creation generates expo-crypto UUID and persists it before POST, reuses it on explicit retry after fresh readback. No tokens, ratings/comments or frozen facts are stored in pending metadata. Pending metadata is bound to account+project; malformed/unavailable local journal fails closed for mutations. Finalize/publish use backend revision guards. Unknown response, HTTP408, network failure and server errors remain uncertain; server-confirmed 4xx validation/conflict can be reread. Requests timeout at45s and abort on unmount/session/project change. Own rating requests never automatically resend after conflict/timeout; fresh revision is loaded first.

Reuses lifecycle revalidation (navigation mount/focus, web focus/visibility, native AppState) with one in-flight read and coalescing, abort guards and no indefinite polling. Successful mutations force model/readback renewal. Scope is keyed by account/project; stale responses cannot populate another project/session. No background worker or provider token exists in FE.

## Verification (2026-11-23)

Read-only live preflight: Project A Completed at `2026-11-23T05:15:57.004047Z` by user's action, OfficialV2, no A snapshot/cohort/OfficialRun at audit start; health200. Both associations/jobs and A/B verified identity baseline retained. No live login or mutation was needed. All browser API requests (including auth fixture login) and writes were intercepted and constrained to localhost API origin; no fixture mutation reached live DB.

- Final combined focused tests: **91 PASS / 0 FAIL / 0 SKIP**, including24 new Contribution tests and67 existing focused tests. No rerun count inflation.
- New real Chrome/Expo fixture: **22 PASS / 0 FAIL**, full Creator lifecycle, ambiguous capture/run, multi-repository membership, own Peer forms/conflict, member privacy/Published-only, unsupported workflow/403, responsive390px Web, focus request coalescing and late-response project switch. No uncaught page errors or unexpected React Native text-node console errors in final run.
- Existing GitHub browser regression: **16 PASS / 0 FAIL**. Separate scenarios, not added to unit totals.
- New Contribution files focused ESLint: **PASS**, zero errors/warnings. Expanded lint including shared Hub files retains **2 baseline errors** in ProjectHubUI (cover reset effect/ref assignment), **2 baseline warnings** in ProjectHubDetailScreen. Their logic was not modified to silence unrelated lint.
- Full TypeScript: **FAIL with13 existing errors**, all opportunities.tsx and AssessorProfilePosts.tsx; no new feature/shared-edit TS errors.
- `git diff --check`: PASS. Existing line-ending warnings only.
- Desktop/mobile Web screenshots reviewed in `%TEMP%/uninet-contribution-ui/`. Native device/custom build NOT TESTED; native AppState/SecureStore code is implemented, not a claim of device E2E success. No full Expo production/native release build attempted.

## E2E usage — actions belong to user

1. Keep existing local API and Expo environments. Open Project A -> Đóng góp as Student A. No IDs/credentials need entering in the dashboard.
2. A confirms **Chốt dữ liệu GitHub** when authorized; inspect current policy2/readiness/coverage/limitations. If not Ready, resolve reasons; do not create Run.
3. A confirms **Bắt đầu đánh giá thành viên**, roster A+B+C displayed.
4. A/B/C log in separately and each supplies their own two ratings; no test rating was created live. Only submit when intended; review revisions on conflict.
5. A closes only at ReadyToClose with complete directed pairs, inspects Peer state, then confirms Draft creation.
6. A reviews details/exclusions/audit, submits, approves or rejects with feedback. Finalize and Publish are independent explicit confirmations. None has been executed live during implementation.
7. Members see only own official Published result in Dashboard/Members. Before publication they see explanatory empty state.

## Contract gaps and production limits

- There is no authorized public/member Published roster endpoint; other member-row values remain unavailable. Smallest future contract would be project-authorized published roster summaries with explicit audience policy; do not repurpose Creator Run detail.
- No Backend change was needed for implemented lifecycle. Snapshot/cohort creation lacks a request idempotency token and exact capture ownership receipt; unresolved requests block duplicates pending operator verification. Backend idempotency extension would improve recovery UX; this feature does not fabricate it.
- Full live capture -> Peer -> scoring -> publication is intentionally **NOT TESTED**; must be authorized/user-driven. Browser mutation success is fixture evidence only.
- Existing scoring limitations (partial patch overlap, historical force-push), caller/system clock mismatch, future authorization loss and baseline TS/lint debt remain visible/guarded.
- Global dark theme is not currently provided by Project Hub; new components reuse its colors.surface/canvas tokens and do not introduce a competing theme.

No migrations, sync, backend restart/config edit, original E2E/Neon access, identity mutation, commit/push or live irreversible operation.

## 2026-11-23 — Simplified approval and publication versions (source implementation, NOT deployed)

This section supersedes the multi-click normal approval UX above. New normal path is **Creator preview -> Duyệt và công bố**, one server transaction; FE does not chain submit/approve/finalize/publish calls. Low-level old endpoints remain for compatibility, not shown as the normal happy path. Creator sees Git/Peer/Contribution values, exclusions, limitations and calculation policy in preview. **Chưa đồng ý với kết quả** opens adjustment choices without changing or publishing immutable results.

**Điều chỉnh Contribution** offers recalculation with selected frozen inputs, a fresh real Peer round, or a new Git snapshot. Availability is controlled by `GET version-capabilities`; without the new Backend/schema, new actions fail closed and no legacy multi-call fallback is used. A round is distinct by its cohort/snapshot IDs; no rating is copied. New round progress supersedes the old round in the preparation panel but old Published member score remains current until new publication.

`POST runs/{runId}/approve-and-publish` carries expectedRevision, expectedPublishedRunId, optional reason. Backend locks project and revalidates Git/Peer/hash/authorization. Internal transition audits and publication ledger commit together. Idempotent same-Run replay cannot make a superseded version current again. HTTP conflict/readback rules remain. Pending Run metadata now also freezes Git/Peer Snapshot IDs with its RequestId so retry cannot silently substitute newly selected inputs. Same-input calculation returns existing Run with reusedInputs=true; UI explicitly says no new result was created.

Creator history uses `GET versions` and existing project-authorized Run/audit detail. Current/version/superseded labels come from server, not FE timestamp sorting. History access for Members is intentionally not added without an approved audience policy; Members still read only own current Published result. No public rating/history disclosure.

Deployment prerequisite: additive Backend migration `20261123061945_AddOfficialContributionPublicationVersions`, reviewed separately; NOT applied to FE clone in implementation. The old live API has not been restarted/upgraded. New FE controls are gated until Backend deployment. Existing run data is not altered by FE.

Latest tests: 94 focused FE tests PASS (27 Contribution +67 existing); redesigned Contribution browser24 scenarios PASS. New files lint clean; full TypeScript retains13 baseline errors outside feature. Native/live publication not tested. See Backend [versioning handoff](../../../UniNet_BE/docs/agent-handoff/UNINET_OFFICIAL_CONTRIBUTION_PUBLICATION_VERSIONS_20261123.md) for migration review, rollout risks and manual v1/v2 test instructions.

## Local E2E deployment verified — 2026-11-23
Publication versioning migration is now applied on FE clone only (105 migrations); API PID15640 health200 worker-off. Actual version-capabilities returns supported/canAdjust/canOpenPeerRound=true for Creator A; existing publication imported as current version1 with hashes preserved. Reopen Đóng góp to refresh capabilities. No live adjustment/round2 mutation was performed. See [deployment report](../../../UniNet_BE/docs/agent-handoff/UNINET_OFFICIAL_VERSIONING_E2E_DEPLOYMENT_20261123.md).


## Combined Git + Peer adjustment — 2026-11-23 (source, not E2E deployed)
Creator → Điều chỉnh Contribution → **Cập nhật cả GitHub và Peer** opens a six-step guided panel inside the existing dashboard. Every irreversible action requires explicit confirmation. Backend durable plan owns exact Project/Association/Manual Job IDs and write-once new Git Snapshot/Peer Cohort/Run links. Old SyncReady/latest IDs do not satisfy freshness. Start journal uses account+project+RequestId; GET by-request reconciles ambiguous start; POST capture replay returns the exact owned snapshot. No blind recapture, no automatic rating/publish.

Backend new migration `20261123071955_AddGitContributionAdjustments` and separate isolated consumer rollout approval are required. Live API remains old/worker-off; missing endpoint/schema shows unavailable, never starts workers. Runtime configuration is operator-owned. Partial failures/missing checkpoints/auth/scope drift block Git capture; Git gaps block Peer. Bounded polling stops and exposes status check; active app/navigation lifecycle refresh remains.

New Peer uses effective roster including Creator and members without Git identity. Existing own-rating forms, ReadyToClose and immutable snapshot APIs remain. Creator alone reads new Draft and Published comparison; Members retain own current Published result and cannot fetch adjustment/Draft/private ratings. Existing atomic approve-and-publish and version history are unchanged.

Counts are raw observations/newly observed frozen versions, not eligible contributions. Server comparison after Ready capture reports NoEligibleChanges only when scored content/owner/activity identities equal baseline frozen input. No automatic new points. Policy warning: source currently uses CommitterDate range, not CompletedAt as a blanket scoring cutoff.

Tests:36 Contribution unit +67 related;32 browser fixture scenarios including8 combined; feature lint clean. Full TypeScript13 unrelated baseline errors remain. Browser API requests are fully intercepted; no live GitHub/E2E mutation or native-device success claimed. Full schema/deployment/manual instructions: [Backend combined handoff](../../../UniNet_BE/docs/agent-handoff/UNINET_GIT_PEER_ADJUSTMENT_IMPLEMENTATION_20261123.md).

## Combined workflow deployment — 2026-11-23
FE clone now has106 applied migrations/0pending, including AddGitContributionAdjustments. Current source API PID27672 health200 with adjustment-only coordinator, global/manual-enqueue/legacy-scoped workers off. Existing Published v1 unchanged; no new plan/job/snapshot/cohort/rating/Run/publication yet.

Real integrated browser reached expired-session401 at Project A; user must log in Creator Student A before live guided workflow can proceed. No mocked test is counted as live E2E. Automatic approval review rejected credential injection into browser process, so no automated credential workaround was attempted. Do not request secrets in chat. Existing user authorization permits scoped Project A sync/capture/new Peer after login, but no Agent ratings or publication.

[Deployment report and exact continuation](../../../UniNet_BE/docs/agent-handoff/UNINET_COMBINED_ADJUSTMENT_E2E_DEPLOYMENT_20261123.md).

## Real combined FE E2E continuation — 2026-11-23
After user login, real integrated FE created adjustment42f0571a-26d7-4f18-93dd-c8139518f2de, completed two exact Project A Manual jobs, captured policy2 GitSnapshot8b989a3c-67bd-4b1b-a27c-ace43fdeeed5 (Ready,NoEligibleChanges), then opened cohort9eea2555-9223-4968-aba5-026950b6718b with A/B/C and0/6new submissions. No Agent ratings, Peer close, Draft or publication. Published v1 unchanged; Project B preservation verified.

Live defect fixed: opening Peer cohort must not mark evaluation completed. `adjustmentStage` keeps Peer active until PeerSnapshot exists. Two new unit regressions; Contribution38PASS, affected ESLint clean; real DOM verified after hot reload. Human accounts now supply six genuine directed ratings before ReadyToClose and Draft. Full live IDs, receipts, preservation and next actions are in [deployment report](../../../UniNet_BE/docs/agent-handoff/UNINET_COMBINED_ADJUSTMENT_E2E_DEPLOYMENT_20261123.md).

## ReadyToClose → actual Draft v2 — latest live check
Genuine cohort reached6/6ReadyToClose. Fixed navigation precedence that let existing Published v1 hide the close action for the exact owned combined cohort. Regression first failed, then39Contribution testsPASS; affected ESLint clean. Actual Creator FE closed cohort and created Draft via combined attempt, without Agent ratings or publication.

PeerSnapshot23e5816d-594c-4a1d-926c-677230498efe; Draftbc807db1-3bdc-4414-a621-3ce96050e913,Ready/revision0. Preview A83.50/B16.50/C0 versus existing Published A84.59/B15.41/C0; total100.00,External0. Current version1 remains unchanged. Preview left open before Duyệt và công bố; user decides publication explicitly. [Complete handoff](../../../UniNet_BE/docs/agent-handoff/UNINET_COMBINED_ADJUSTMENT_E2E_DEPLOYMENT_20261123.md).

## Published percentages in Members — 2026-11-23, deployed
Members tab now reads minimal `GET /api/projects/{projectId}/contribution/v2/results/public` for all visible rows. Active Student outside a public project can see frozen Published percentages; private project requires Creator/effective membership. Guest remains blocked because existing Project Detail is authenticated-only. No GitHub verification required for aggregate scores. Raw Git identity/Peer/Draft reads stay private.

Version header, explicit unpublished empty state,0% versus missing distinction, safe error clearing and project/account abort isolation are implemented. Foreground/tab refresh + active60-second metadata check select current ledger version; no scoring/Publish control added. Successful atomic publication notifies same-window refresh. Frozen roster is not rebuilt from current membership.

Live Project A already had Publishedv2 before rollout, so current UI shows A83.50/B16.50/C0; v1 remains historical. API PID25836 health200,106migrations, no schema/data/scoring changes. Live A/B/C independently verified; live guest401; outsider verified on disposable HTTP/browser fixtures (no live outsider-A credential).112unit cases,7Backend focused cases,10browser fixture scenariosPASS. Feature lint clean;13unrelated TS baseline errors remain.

[Full deployment/privacy report](../../../UniNet_BE/docs/agent-handoff/UNINET_PUBLIC_OFFICIAL_CONTRIBUTION_MEMBERS_20261123.md).

## Production UI cleanup — 2026-11-23
Default UI now omits snapshot/job/attempt IDs, hashes, revisions, raw JSON and diagnostic-only notes. Three cards/current Published result remain. Combined update uses5steps with exact existing guards and journal: sync → chốt Git → Peer → preview → publish. No automatic mutation or changed score calculation.

Category/activity warnings and component points expand in readable user details; component points are not percentages. Technical diagnostics remain available through authorized Backend development tools, not a public Debug screen or FE flag. Business audit/history and all services are retained. Successful ambiguous-request reconciliation clears its obsolete error only after pendingResolved confirms durable state.

Members retains Public Published % and role names in Vietnamese. Unlink sits behind own GitHub management and existing confirmation; identity reload appears on failure.120unit cases and58intercepted browser scenariosPASS. Feature lint clean;13unrelated TS baseline errors remain. Live verification read-only, no Backend/source/schema/worker change. Screenshots and limits: [complete handoff](../../../UniNet_BE/docs/agent-handoff/UNINET_GITHUB_CONTRIBUTION_PRODUCTION_UI_CLEANUP_20261123.md).
