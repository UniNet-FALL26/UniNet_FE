# Student verification handoff

## Behavior and reuse
Student Settings now shows a backend-driven badge/description. The account popup keeps name/email/role/verification and supports Unverified, Pending, Approved and Rejected. Red verification/resubmission actions switch to the form within the same modal and route; cancel returns, failures retain inputs, success refetches and returns to the submitted snapshot. Pending/Approved never offer another submission. Rejection exposes reason/date and allows updated metadata and a new document. Status refreshes on focus, popup open, foreground, every 30 seconds and after submit; approved state syncs the auth profile flag. Review notifications open the account popup.

Reused: Settings/account details, Input, Button, React Native Modal focus trap, bearer refresh/error handling (`apiRequest`), role constants, auth store, backend `UserVerifications`, verification enums/profile flag, JWT role checks and existing notifications. `Button.textStyle` is optional and only customizes compact form footer labels. Native document picking uses SDK-compatible `expo-document-picker` 57.0.3 with `copyToCacheDirectory`; web uses accessible file input/drop zone and local object URLs (revoked on change/unmount). Reference: https://docs.expo.dev/versions/latest/sdk/document-picker/.

## Privacy and backend integration
JPG/PNG/PDF, 1 byte–5 MiB; FE validates filename/type/size, BE also validates signatures and roles. Documents are stored as private base64 inside existing verification JSON, never public image storage. This increases stored payload size by about one third; status/notification DTOs omit bytes and URLs. Owner/Admin-only attachment route uses no-store/nosniff. Overview never requests documents. Server derives owner from JWT; PostgreSQL transaction advisory locks and conditional review prevent duplicate Pending/review; 60-second resend cooldown; history retained. Approval syncs reviewed name/school/code to profile, and later profile invalidation restores eligibility.

**Before deployment:** apply backend migration `20261017152032_AddStudentVerificationNotifications` and deploy API/FE together. It adds a nullable notification target FK/index/check; no new table or destructive Up operation. It was generated, inspected and tested against model/schema fixtures, not applied to a live database. Down refuses to remove student notification history. Existing memory-only token policy remains: reload requires login, then the backend returns the persisted verification state.

API contract: `GET /student/verification/me`; multipart `POST /student/verification` (`fullName`, `schoolName`, `studentCode`, `document`). DTO: id, status nullable/0/1/2, isVerified, fullName, schoolName, studentCode, submittedAt, reviewedAt, rejectReason, documentName. `GET /student/verification/{id}/document` is authenticated. Admin list/detail/approve/reject: `/admin/student-verifications`. Existing `/verification-notifications` is extended for active Students and their own notifications.

## Files in this feature (prior profile/auth edits are separate)
Frontend additions:
- `src/types/student-verification.ts`
- `src/utils/student-verification.ts`
- `src/services/student-verification.service.ts`
- `src/hooks/useStudentVerification.ts`
- `src/components/settings/StudentVerificationModal.tsx`
- `src/components/settings/VerificationDocumentPicker.tsx`
- `src/components/settings/StudentVerificationNotifications.tsx`
- `tests/student-verification.test.cjs`
- `tests/student-verification-browser-check.cjs`
- `docs/specs/student-verification.md`, this handoff

Frontend modifications:
- `src/app/settings.tsx`
- `src/app/(tabs)/notifications.tsx`
- `src/components/ui/Button.tsx`
- `tests/settings-browser-check.cjs`
- `package.json`, `package-lock.json`

Backend additions (under sibling `UniNet_BE`):
- `UniNet.API/Controllers/StudentVerificationController.cs`
- `UniNet.Application/DTOs/Verification/StudentVerificationContracts.cs`
- `UniNet.Application/Services/StudentVerificationService.cs`
- `UniNet.Infrastructure/Data/Migrations/20261017152032_AddStudentVerificationNotifications.cs` and `.Designer.cs`
- `UniNet.Tests/StudentVerificationTests.cs`
- `UniNet.Tests/StudentVerificationHttpTests.cs`
- `docs/specs/student-account-verification.md`, `docs/handoffs/student-account-verification.md`

Backend modifications:
- `UniNet.API/Program.cs`
- `UniNet.API/Controllers/VerificationNotificationsController.cs`
- `UniNet.Application/Services/VerificationNotifications.cs`
- `UniNet.Domain/Entities/VerificationNotification.cs`
- `UniNet.Infrastructure/Data/VerificationAdminActionConfiguration.cs`
- `UniNet.Infrastructure/Data/Migrations/UniNetDbContextModelSnapshot.cs`

## Validation and limitations
- TypeScript and web static export pass; backend API build and EF pending-model consistency pass.
- 5 new FE rule/service tests + 25 existing refresh/session tests pass.
- 9 focused backend tests pass: real JWT/multipart HTTP, expired/other-role access, private owner/Admin downloads, cross-account denial, concurrent submit/review, file limits/signatures, rejection/resubmission, approval/profile invalidation, notifications.
- Mocked browser suite passes at 320/440/1440px: states/form/cancel/X/Escape/Tab/focus/validation/upload preview/remove/PDF/resubmit/error retention/duplicate lock/refetch/reload+login/notification navigation/expired session/other roles. Existing Settings browser regression also passes. Screenshots are ignored under `dist/student-verification`.
- Whole FE unit suite: 119 passed, 41 failed of 160. Failures are in untouched `profile-image-picker.test.cjs` (6, old loader resolves missing `src/api.ts`), `project-detail.test.cjs` (11, missing mock for ProjectVerificationFlow), `project-service.test.cjs` (24, mock import/contract expectations). Log: ignored `dist/student-verification-unit-tests.tap`.
- Whole BE run before final validation-only additions: 445 passed, 5 failed, 2 skipped of 452. Failures outside Student verification: 3 partner registration AuthTests, skill-category assertion, transaction route expected 200/got404. See backend handoff for exact names.
- `npm run lint` attempted: repo has no ESLint/config; Expo bootstrap could not connect through the sandbox proxy. No unrelated lint dependencies/config were installed.
- `npm audit`: 34 advisories (11 moderate/22 high/1 critical, critical package shell-quote); no advisory for added expo-document-picker. No automatic dependency-wide upgrades. Audit JSON is ignored under `dist/student-verification-audit.json`.
- Not verified: physical Android/iOS device and keyboard behavior, actual PostgreSQL locking/migration execution, deployed production API, or an end-to-end real student document submission/admin review. Browser requests were fully mocked and backend HTTP tests used isolated SQLite; no user documents/accounts were submitted.
- Review found and fixed FE/BE student-code rule mismatch and focus restoration after modal stage changes; follow-up review found no remaining concrete blockers.
