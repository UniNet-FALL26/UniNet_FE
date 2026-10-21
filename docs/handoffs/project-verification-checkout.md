# Student S06 — checkout and payment result

Entry: Completed project → Continue level 2 → held booking / existing payment → “Tiếp tục thanh toán” or “Xem thanh toán và kết quả”. Checkout route `/group/checkout/[verificationId]`, with optional `projectId` for back navigation only.

## Behavior

- Opening checkout performs GETs only. Show package price before creation; after creation use the transaction's backend amount and currency. POST sends no amount, packageId, URLs, or other client payment fields.
- Explicit “Tạo checkout thanh toán” reconciles server state before POST; “Mở PayOS để thanh toán” opens the HTTPS URL returned by the backend. These separate steps preserve the browser's click gesture when opening a new tab. Native uses the existing expo-web-browser dependency.
- Existing Pending payments resume; old Pending/Success/manual-review summaries are resolved by transactionId even if they are absent from the first history page. No automatic payment POST on mount, timer, return, or POST error.
- POST errors trigger GET reconciliation. Buttons remain blocked while GET is failing. Failed payments may retry only while the reservation is held, current, and free of pending/successful/manual-review payments. Expired Pending payments require backend reconciliation and do not offer rebooking/payment retry here.
- Only backend payment status and booking state determine success. A success payment without Confirmed booking shows an inconsistent-state message and blocks additional payment. Redirect query flags are ignored.
- Read payment status and detail every 12 seconds while visible and nonfinal; stop after three consecutive failures. Background/hidden tabs pause requests. Focus, app foreground, URL return and native browser dismissal refresh GETs. Timers and listeners clean up on blur/unmount.
- Countdown disables links locally at expiry. A link must have matching reservation/transaction deadlines, a Pending payment, HTTPS, no URL credentials, and no review flags. No expired link is reused.
- Web opens a separate tab, preserving the original checkout session. Native browser dismissal returns to checkout. Backend owns PayOS ReturnUrl/CancelUrl configuration; frontend does not manufacture a callback URL or treat provider redirects as evidence.

## Validation

Focused tests cover eligibility, expiry/review, older Pending resume, service paths/body, redirect flags, rendered screen states, and polling/background/error cleanup. TypeScript retains the existing unrelated `colors.overlay` error at `src/components/workspace/TaskEditorModal.tsx:490`.

`node --test tests/verification-payment.test.cjs tests/verification-booking.test.cjs tests/project-verification.test.cjs`: 22 passed. `npx expo export --platform web --max-workers 2`: passed, including `/group/checkout/[id]`. `git diff --check`: passed.

No live payment was created or submitted. Real PayOS/webhook/background reconciliation, deployed return URLs and native-device behavior still require environment testing.
