# Student S04 / S05

- Open a Completed project as its creator, then use “Chọn gói xác minh cấp 2” or “Tiếp tục hồ sơ cấp 2”. Route: `/group/verification/[projectId]`.
- S04 fetches active Verification packages for Student with server pagination. Prices and duration come from package DTOs; service inclusions are not invented because the backend provides no description field. Creating an application sends only the selected packageId and does not initiate payment.
- Always search Pending applications before creating; resume existing applications on entry and after uncertain mutations. Creation and reservation have an immediate ref lock against duplicate taps. Failed mutations reconcile through GET rather than automatic resubmission.
- S05 fetches seven-day ranges, groups server slots in the returned timezone, shows remaining capacity and sends exact startAt/endAt values. Reservation uses ReservedUntil for countdown; expiry and app foreground refresh state. No schedule changes with a pending/successful payment, manual review, assignment, meeting start/end, confirmed/legacy booking, or final application state.
- Slot conflict reloads availability while preserving the selected day when still available. Errors retain a visible notice; a failed reconciliation blocks submission until a successful reload.
- Checkout is S06 and remains outside this implementation. The held state explicitly says payment is the next screen; no checkout URL, payment success, or specialist assignment is fabricated.

Validation: `node --test tests/verification-booking.test.cjs tests/project-verification.test.cjs` — 13 passed. `git diff --check` passed. TypeScript reports an existing `colors.overlay` error at `src/components/workspace/TaskEditorModal.tsx:490`; no errors reported in these additions. Real authenticated backend booking/payment and native-device visual behavior have not been tested.

Web export was attempted and stopped after remaining at Metro startup without producing a result. A successful web export and visual QA are not confirmed.
