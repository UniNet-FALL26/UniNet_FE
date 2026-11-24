# Student S04 / S05

## Schedule alignment (2026-11-24)

- Density refinement: calendar padding/gaps reduced, desktop date/week controls
  are 36px, time cells are a consistent 148px rather than stretching the last
  row. Smaller time text/capacity badges; mobile keeps 44px date/week controls
  and full-width time cells. Five-width browser flow passed.

- Scheduling calendar/clock/chevron icons are drawn with native View borders
  via VerificationBookingIcon, avoiding font glyph fallback squares. Footer
  “Quay lại” returns to checkout when editing a held meeting; otherwise it uses
  navigation history with a project-details fallback. Back is disabled while
  loading/mutating. Browser fixture and 15 booking/payment tests pass.

- Follow-up: omit the post-create ready banner and initial “Chưa chọn lịch”
  status card; remove refresh/dossier actions from scheduling. Calendar fills
  available width. Held/expired/blocked guidance and checkout return remain.
  Full browser flow still passes.

- Calendar/slot card is primary, status/actions sit in a 300px right column
  from 900px; phones stack calendar before status. Cards use 16px padding,
  compact type and 44px flat actions. Reservation/footer guards remain intact.
- Replace dynamic icon wrappers with shared HubIcon to fix unsupported web
  icon names. Add QR/refresh entries for checkout; no dependencies added.
- Extended registration browser fixture covers responsive calendar/checkout,
  selecting and editing slots, exact hold payload, explicit QR creation and
  pending/paid/review/expired presentation. 15 booking/payment tests pass.
- Existing lint findings remain for clock initialization/expiry effect and
  hook dependency rules; TypeScript still only reports unrelated existing
  opportunities.tsx/AssessorProfilePosts.tsx errors.

## Registration redesign (2026-11-24)

- Density follow-up: constrain page/footer to 1000px, summary to 300px, reduce
  card padding/gaps and typography, and use a 44px CTA with 14px label.
  Five-width registration browser fixture still passes.

- VerificationRegistrationPanel shows service and eligibility beside a summary
  from 900px, stacked on smaller screens. API package name/price/duration are
  displayed. A sole package is static with “Đã chọn sẵn”; no redundant radio.
- On package load, auto-select only a single eligible package on a one-page
  result. Preserve valid choices; clear unavailable choices. Multiple packages
  still support explicit selection and server pagination.
- Header, step labels and breadcrumbs distinguish registration from scheduling.
  Blue buttons and selected surfaces are flat; decorative shadows removed.
- Creation still happens only after “Tiếp tục chọn lịch”. Existing pending
  application reconciliation, locks, schedule and checkout behavior remain.
- Chrome fixture passed at 320/375/768/1024/1440px: auto-selection, summary,
  responsive columns/no overflow, flat CTA, empty/inactive/multiple packages,
  exact create payload and resume without duplicate creation. Screenshots in
  workspace root: verification-registration-1440.png and -375.png.
- Booking/payment: 15 tests pass with
  `node --test --experimental-test-isolation=none tests/verification-booking.test.cjs tests/verification-payment.test.cjs`.
- Existing project-verification.test.cjs has 3 stale failures referencing
  removed level1Message/getLevel1/retry APIs; those modules are unchanged here.
  New panel ESLint clean; booking screen retains pre-existing lint findings in
  BookingIcon try/catch, Date.now initialization and expiry effect.
  TypeScript reports only existing opportunities.tsx/AssessorProfilePosts.tsx
  errors. Native-device and real payment/backend integration were not run.

- Open a Completed project as its creator, then use “Chọn gói thẩm định” or “Tiếp tục hồ sơ thẩm định”. Route: `/group/verification/[projectId]`.
- S04 fetches active Verification packages for Student with server pagination. Prices and duration come from package DTOs; service inclusions are not invented because the backend provides no description field. Creating an application sends only the selected packageId and does not initiate payment.
- Always search Pending applications before creating; resume existing applications on entry and after uncertain mutations. Creation and reservation have an immediate ref lock against duplicate taps. Failed mutations reconcile through GET rather than automatic resubmission.
- S05 fetches seven-day ranges, groups server slots in the returned timezone, shows remaining capacity and sends exact startAt/endAt values. Reservation uses ReservedUntil for countdown; expiry and app foreground refresh state. No schedule changes with a pending/successful payment, manual review, assignment, meeting start/end, confirmed/legacy booking, or final application state.
- Slot conflict reloads availability while preserving the selected day when still available. Errors retain a visible notice; a failed reconciliation blocks submission until a successful reload.
- Checkout is S06 and remains outside this implementation. The held state explicitly says payment is the next screen; no checkout URL, payment success, or specialist assignment is fabricated.

Validation: `node --test tests/verification-booking.test.cjs tests/project-verification.test.cjs` — 13 passed. `git diff --check` passed. TypeScript reports an existing `colors.overlay` error at `src/components/workspace/TaskEditorModal.tsx:490`; no errors reported in these additions. Real authenticated backend booking/payment and native-device visual behavior have not been tested.

Web export was attempted and stopped after remaining at Metro startup without producing a result. A successful web export and visual QA are not confirmed.
