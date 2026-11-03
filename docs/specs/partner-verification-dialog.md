# Partner verification dialog

## Verified partner snapshot
The account overview displays **Thông tin đã được duyệt** after approval, matching Student overview semantics: organization name, tax/registration code, representative, submitted date, reviewed date and status. Per the latest user instruction, omit partner type. Pending/Rejected show the same submitted snapshot under **Thông tin đã gửi**. Missing optional/legacy values display a neutral placeholder; never substitute current editable profile fields for submitted metadata.

Extend `GET /partner/verification/me` and submission responses additively with nullable `organizationName`, `taxCode`, `representativeName`, `reviewedAt`. Read allowlisted scalar fields from persisted `VerificationData`, with safe handling of malformed/legacy data. Keep ownership checks; return no document bytes, URLs, reviewer identifiers or raw JSON. No migrations/new storage.

Plan: first prove missing snapshot with backend response tests and the existing account browser regression; add DTO/projection, then typed FE snapshot rows; verify focused backend tests, account/browser regression, TypeScript, export and handoff. Test profile edits do not rewrite reviewed metadata, review dates for approval/rejection, empty/legacy snapshots and cross-account isolation.

## Latest user change
Remove the partner Settings row “Xác minh tài khoản” and its modal wiring. The profile reminder remains the modal entry point; `/verification` remains available directly. Browser regression must assert the Settings entry is absent.

## Partner account information states
The existing **Thông tin tài khoản** entry opens an account overview matching the Student account presentation: display name, email, role, colored verification badge, explanatory status panel and submitted date when available. Use partner wording and the existing partner status API; do not display unavailable submitted organization/tax/document fields as reviewed snapshots.
- Unverified/Cancelled: red verification CTA opens the existing partner form in the same route; cancel returns to account overview.
- Pending: submission confirmation and date, no resubmission action.
- Rejected: rejection reason, submission date and red **Cập nhật và gửi lại** action.
- Approved: success panel, no submission action; sync auth/profile verification flag.
- Status refresh on account opening, foreground/focus and every 30 seconds; error supports retry and never invents an unverified state. Abort stale requests on unmount/account switch. Preserve the removed standalone Settings entry and all Student/Admin flows.

### Implementation and verification
1. Add a failing browser regression for partner account states, CTA/form/cancel/submit, status errors, mobile fit and removed Settings row.
2. Add a focused partner-status hook and account modal, reusing the existing partner form and current modal/typography/color conventions. Wire only partner account information in SettingsPanel and its optional profile callback.
3. Run `node tests/partner-account-info-browser-check.cjs`, existing partner dialog/hero regressions, `npx tsc --noEmit`, and static web export. Update handoff with outcomes and limitations. No new dependencies, backend contracts or schema changes.

## Accepted direction
Follow the user's student-style presentation alternative: profile banner and partner Settings open a compact modal over the current screen, keeping its URL and content. Keep `/verification` as a bounded direct-link fallback.

## Acceptance and boundaries
- Reuse existing partner profile/status APIs and multipart `submit-multiple` contract, HTTPS validation, partner document types and file-picker validation. Pending/approved requests cannot be submitted again.
- A centered dialog (max 600px) has a clear header, status summary, organization information, document list and fixed footer. Its body scrolls and supports keyboard avoidance on mobile. Support document add/remove/collapse and URL/file sources.
- Submitted state updates the parent's banner immediately. Close restores the same screen. Keep per-field errors and global transient API feedback; block close/repeat submission while saving.
- Existing student verification behavior remains unchanged. No schema/dependency/auth changes.

## Plan and checks
1. Add browser regression for modal opening without navigation, compact layout, URL validation, multipart payload, failed-save retry, pending-state lock, close and settings entry point. Prove failure first.
2. Move partner verification state/handlers into a reusable `PartnerVerification` component; use a modal when given `onClose`, and a centered page for the existing route.
3. Wire profile and shared Settings partner actions, preserving student actions. Verify with `node tests/partner-verification-dialog-browser-check.cjs`, existing student/partner profile checks, and `npx tsc --noEmit`.

## Continuation: review result consistency
- Status views offer an explicit refresh using the existing read APIs. Approval/rejection can be checked without closing or navigating; failed refreshes support retry.
- Loading a verification result synchronizes the authenticated partner profile flag. The profile dialog callback also updates the visible organization badge; Pending/Approved stay locked and Rejected permits resubmission.
- First reproduce stale approval in the browser regression, then update the dialog/profile callback, then verify mixed URL/PDF multipart submission and rejected resubmission. Reuse current components, typed service and state conventions; no API/schema/dependency changes.
- Checks: `node tests/partner-verification-dialog-browser-check.cjs`, `node tests/partner-profile-hero-browser-check.cjs`, `node tests/student-verification-browser-check.cjs`, `npx tsc --noEmit`. Source: `src/components/company/PartnerVerification.tsx`, `src/app/(company)/profile.tsx`; regression: `tests/`; handoff: `docs/handoffs/partner-verification.md`.
