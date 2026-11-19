# Partner account verification

## Current behavior
- Profile banner opens a compact modal without changing routes; `/verification` remains the direct route. Partner Settings has no standalone “Xác minh tài khoản” row.
- **Thông tin tài khoản** opens `PartnerAccountModal`, matching the Student account layout: name/email/role, colored badge, status notice, rejection reason and submission date. Unverified/Cancelled and Rejected show a red CTA into the existing partner form. Cancel returns to the overview; successful submission returns to Pending. Pending/Approved have no submission CTA.
- Approved overview includes **Thông tin đã được duyệt**: organization name, tax/registration code, representative, submission/review dates and status. Pending/Rejected use **Thông tin đã gửi**. Per user request, partner type is omitted. Fields come from the persisted submission snapshot, never current editable profile fields. Missing optional/legacy values show “Chưa có thông tin”.
- Backend `PartnerVerificationStatusResponse` and FE service type add nullable `organizationName`, `taxCode`, `representativeName`, `reviewedAt`. GET status and submit responses project allowlisted scalar fields from existing `VerificationData`; no document payloads/URLs, raw JSON, reviewer IDs or schema changes. Deploy the updated API with the frontend to populate these fields.
- `usePartnerVerification` refreshes on overview opening/focus/foreground and every 30 seconds while active; pauses while the form is open. Requests abort on cleanup/account change. Results sync the authenticated profile flag and embedded profile callback. Loading failures show retry rather than an actionable unverified fallback.
- Existing multipart service submits 1–10 HTTPS/file documents (JPG/PNG/PDF, up to 5 MiB each). Pending/Approved are locked; rejected requests show the reason and allow resubmission. Failed saves preserve drafts.
- Pending/Approved views offer **Kiểm tra trạng thái**. It reloads the profile/result using existing APIs, supports retry on load failure, updates the profile badge/banner through a stable callback, and synchronizes the matching authenticated profile's `isVerified` flag.
- The profile modal callback updates the visible organization badge. Student behavior is unchanged.
- Invalid-file errors previously disappeared because the picker reports errors before clearing its value. Partner draft updates now preserve that error when the file becomes null; valid replacement/removal clears it through the picker's existing callbacks.

## Continuation files
- `src/components/company/PartnerVerification.tsx`: status refresh, auth flag synchronization, invalid-file error fix.
- `src/components/settings/SettingsPanel.tsx`, `src/app/(company)/profile.tsx`: propagate review results to visible profile state.
- `src/components/settings/PartnerAccountModal.tsx`, `src/hooks/usePartnerVerification.ts`: account overview and owned status lifecycle.
- `src/services/company.service.ts`: typed optional snapshot fields for compatibility with older API responses.
- `tests/partner-account-info-browser-check.cjs`: account states, responsive 320/390/1440px, rejection reason, form/cancel/resubmit, retry, removed Settings row and profile flag synchronization.
- `tests/partner-profile-hero-browser-check.cjs`: close the account overview through its header close control, matching Student behavior.
- `tests/partner-verification-dialog-browser-check.cjs`: mixed URL/PDF payloads, invalid file feedback, save/status retry, approval badge synchronization, rejection/resubmission, locked states, modal/direct route, 320/390/768/1440px.
- `tests/student-verification-browser-check.cjs`: count inline field errors separately from transient alert toasts.
- `docs/specs/partner-verification-dialog.md`: continuation acceptance criteria and plan.

## Verification
- Reproduced stale approval badge and disappearing invalid-file error with failing browser tests before fixing them.
- Partner verification browser regression passes against intercepted API fixtures. TypeScript check (`npx tsc --noEmit`), static web export (`npx expo export --platform web --output-dir dist/partner-verification-web`, 86 routes) and `git diff --check` pass.
- The hero browser regression previously passed. On the account-overview continuation it was updated for the header close control, then timed out at `page.reload` (10 seconds). A retry with a 60-second navigation timeout remained hung and was stopped; the full hero regression is not confirmed on the latest continuation. The focused account test separately verifies the embedded profile callback and approved/rejected hero badge state.
- Partner account overview browser regression passes. Visually inspected rejection desktop and unverified 320px screenshots under ignored `dist/partner-account-info`; layout matches the existing Student presentation. Shared Student verification rule/service tests: 5 pass (`node --test tests/student-verification.test.cjs`).
- Verified-snapshot continuation: browser regression passes including submitted organization/tax/representative/review date and absence of partner type; inspected approved 320/1440px screenshots. TypeScript/export pass. Backend: 7 new snapshot tests plus 2 existing notification tests pass with a fresh build (`dotnet test UniNet.Tests/UniNet.Tests.csproj --no-restore --filter "FullyQualifiedName~PartnerVerificationStatusTests|FullyQualifiedName~PartnerNotificationTests" --verbosity quiet -p:UseSharedCompilation=false -m:1 -nr:false`). Covers submission/approval/rejection, snapshot immutability, malformed legacy JSON, cross-account isolation and private-field omission.
- Backend existing `PartnerNotificationTests`: 2 pass using `dotnet test UniNet.Tests/UniNet.Tests.csproj --no-build --no-restore --filter FullyQualifiedName~PartnerNotificationTests --verbosity quiet`. Backend source unchanged; this uses the existing compiled test assembly.
- Student browser regression passes form validation/upload/pending checks after correcting alert counting, then fails at line 165: it expects reload to discard login, while current `src/utils/storage.ts` persists sessions. Full student regression remains incomplete; no production session behavior changed here.
- Browser fixtures never submit real accounts/documents. Native devices, deployed API and real admin review remain unverified. Existing unrelated working-tree changes are preserved.
