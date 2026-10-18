# Student account verification

## Scope and contract
Preserve account/settings fields and nonstudent behavior. For Students, extend the account popup with four server states: unsubmitted, Pending, Approved and Rejected. Switch to a verification form within the same modal/route; cancel returns to account, successful submit refetches and returns to account with the submitted snapshot. Pending/Approved cannot submit; rejection displays reason/date and allows a new document and edited resubmission. Show corresponding badge/description in the settings row.

Reuse `UserVerifications`, `VerificationType.Student`, existing enum values (Pending 0, Approved 1, Rejected 2), bearer refresh, authenticated APIs, modal/Input/Button and profile account state. Contract: `GET /student/verification/me`, multipart `POST /student/verification` with fullName/schoolName/studentCode/document. Response: id, status (nullable), isVerified, fullName, schoolName, studentCode, submittedAt, reviewedAt, rejectReason, documentName. Overview never exposes documents. Owner/Admin document access remains authenticated at the backend.

## Boundaries
- Require trimmed name/school (max 255) and student code (3–50 letters/numbers/dot/underscore/slash/hyphen); backend is authoritative. No school whitelist or autoapproval.
- JPG/PNG/PDF only, nonempty and <=5 MiB. FE previews selected local files; backend independently checks size/content and ownership. No public image uploads. Use Expo document picker on native and accessible file input/dropzone on web.
- Preserve draft/errors after failure; lock repeated submission; abort reads/writes and discard selected files on logout/account change. Status refresh on focus, account popup open, foreground, periodic polling, and after submit. Synchronize verified profile flag from backend.
- Persist state on backend; existing in-memory session policy still requires login after reload. No changes to authentication persistence, partner registration, public image APIs or unrelated features.

## Plan and verification
1. Backend owner audits table/storage/admin/notifications; adds safe student workflow without destructive migrations and tests authorization, duplicate/race, rejection/history, document validation/access.
2. Frontend adds contract/validation/picker tests, status hook and accessible account/form modal; then wires existing settings row.
3. Isolated browser suite mocks API for all four states, form/errors/upload limits, submit/cancel/refetch, persisted status across re-login, role isolation and mobile/desktop. Run TypeScript, appropriate lint/build, unit/backend tests; document observed failures and limits.

No real verification requests, documents or administrator actions are submitted during automated browser tests. No deploy/commit.
