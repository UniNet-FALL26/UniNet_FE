# Student S06 — checkout and payment result

## Expired QR renewal (latest)

- Keep automatic first QR. Expired eligible checkout shows “Tạo lại mã QR”;
  clicking POSTs /project-verifications/{id}/payments/renew without client data.
- Server reconciles expired pending attempts; only closed/unpaid attempts may
  re-hold the old interval via availability guards and create a new transaction.
  Live attempts are reused; paid/partial/unresolved/review states cannot create
  another charge. Active holds cannot have their deadlines extended by repeats.
- UI reloads current state, never exposes the old QR after expiry, and offers
  “Chọn lại lịch” when the previous slot cannot be kept. Mutations share a lock;
  renewal is never triggered by a timer, focus or reload.
- Verified: 45 backend transaction/HTTP tests, 18 FE booking/payment tests and
  the browser fixture (auto QR, explicit renewal, pending blockage, fresh expiry,
  reload reuse and manual failure recovery). TypeScript has only existing errors.
- Backend must run the updated code to expose the renewal endpoint. No schema
  migration/new dependency or live provider payment was used in verification.

## Automatic QR (latest behavior)

- User requested immediate QR display. Checkout now GETs current state and
  automatically prepares the first transaction for an eligible live hold with
  no transaction/payment history. Re-read after POST to display current QR,
  payment and schedule-lock state. Amount/body remain server-controlled.
- One automatic attempt per account/verification/hold expiry per mounted screen.
  Reuse existing payments; do not automatically retry failed/review/expired
  payments. Uncertain POSTs reconcile with GET, then offer manual retry when
  appropriate. Polling/focus cannot repeat the same automatic attempt.
- Automatic creation suppresses generic mutation toasts; PayOS opens only on
  an explicit click. Creating a QR never marks a payment successful.
- 16 booking/payment tests and the five-width browser fixture pass: immediate
  QR, refresh without duplicate POST, uncertain-success recovery, failed auto
  preparation/manual retry, ineligible states, and pending schedule lock.
- Existing global TypeScript and checkout clock/hook lint findings remain;
  no live provider/payment or native simulator was exercised.

## Compact checkout layout (2026-11-24)

- Further density pass: 960px page, 280px summary, 12px card padding and bare
  ready/pending status within the payment card. Paid/review keep status color.
  Desktop buttons 36px, phones 44px. Secondary dossier/status actions share one
  row with short visible labels and unchanged accessible names. Ready/QR views
  and 15 booking/payment tests passed; payment behavior unchanged.

- Match registration's 1000px page, small typography, thin card borders and flat
  44px buttons. Payment/QR is left; amount/package/meeting/hold and secondary
  actions use a 300px right column from 900px. Phones stack the two regions.
- Header/steps/breadcrumbs now identify payment consistently; shared HubIcon
  supplies valid QR/calendar/clock icons. QR quiet zone/encoding unchanged;
  wrapper padding fits a 320px viewport. No shadows or gradients.
- Browser fixture passed at 320/375/768/1024/1440px with live local API mocks:
  select slot, hold, edit, explicit create once (empty POST body), QR pending,
  paid/review and expiry blocking. Summary remains visible in all states.
  Screenshots inspected; no page errors. 15 booking/payment tests pass.
- Payment guards, polling, retry/reconciliation and URL/QR validation unchanged.
  Simplified ready-state copy removes internal backend terminology.
- Native and real payment providers were not exercised. Existing lint clock/
  hook findings and unrelated global TypeScript errors remain.

Entry: Completed project → Continue level 2 → held booking / existing payment → “Tiếp tục thanh toán” or “Xem thanh toán và kết quả”. Checkout route `/group/checkout/[verificationId]`, with optional `projectId` for back navigation only.

## Behavior

- Opening checkout GETs state, then prepares the first eligible payment automatically. After creation use the transaction's backend amount and currency. POST sends no amount, packageId, URLs, or other client payment fields.
- Manual QR creation remains a fallback after preparation failure and reconciles before POST. “Mở PayOS” opens the HTTPS URL only on a user click. Native uses the existing expo-web-browser dependency.
- Existing Pending payments resume; old Pending/Success/manual-review summaries are resolved by transactionId even if absent from the first history page. An automatic attempt is never repeated for the same hold on polling/focus or POST error.
- POST errors trigger GET reconciliation. Buttons remain blocked while GET is failing. Failed payments may retry only while the reservation is held, current, and free of pending/successful/manual-review payments. Expired Pending payments require backend reconciliation and do not offer rebooking/payment retry here.
- Only backend payment status and booking state determine success. A success payment without Confirmed booking shows an inconsistent-state message and blocks additional payment. Redirect query flags are ignored.
- Read payment status and detail every 12 seconds while visible and nonfinal; stop after three consecutive failures. Background/hidden tabs pause requests. Focus, app foreground, URL return and native browser dismissal refresh GETs. Timers and listeners clean up on blur/unmount.
- Countdown disables links locally at expiry. A link must have matching reservation/transaction deadlines, a Pending payment, HTTPS, no URL credentials, and no review flags. No expired link is reused.
- Web opens a separate tab, preserving the original checkout session. Native browser dismissal returns to checkout. Backend owns PayOS ReturnUrl/CancelUrl configuration; frontend does not manufacture a callback URL or treat provider redirects as evidence.

## Validation

Focused tests cover eligibility, expiry/review, older Pending resume, service paths/body, redirect flags, rendered screen states, and polling/background/error cleanup. TypeScript retains the existing unrelated `colors.overlay` error at `src/components/workspace/TaskEditorModal.tsx:490`.

`node --test tests/verification-payment.test.cjs tests/verification-booking.test.cjs tests/project-verification.test.cjs`: 22 passed. `npx expo export --platform web --max-workers 2`: passed, including `/group/checkout/[id]`. `git diff --check`: passed.

No live payment was created or submitted. Real PayOS/webhook/background reconciliation, deployed return URLs and native-device behavior still require environment testing.
