# Expired verification QR renewal

- QR remains automatic on initial eligible checkout. Expired QR/hold shows
  “Tạo lại mã QR”; renewal happens only on that explicit click.
- POST /api/project-verifications/{verificationId}/payments/renew has no body
  and returns the existing TransactionResponse. Student/owner checks apply.
- Renewal reuses a live pending attempt. For expired pending payments, query
  the provider first: paid, partial, unresolved or review states cannot produce
  another charge. Only a confirmed closed unpaid attempt permits renewal.
- Re-hold the existing scheduled interval through existing availability/policy
  guards, then create through existing payment service. No price/deadline from
  client, no extending an active hold, no automatic expiry renewal.
- Unavailable/past slots require choosing another time. Failures reconcile with
  GET; UI shows current state. Existing locks guard repeated button presses.
- Plan: backend renewal service/route and focused tests; frontend renewal rules,
  action, display and browser fixture; verify and update handoffs.
- Verify backend TransactionTests/TransactionHttpTests; FE booking/payment tests
  and five-width verification-registration-browser-check.cjs; type/lint checks.
- No schema/dependency changes, no live provider calls during verification.
