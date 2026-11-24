# Schedule and checkout visual alignment

## Automatic QR follow-up
- Opening checkout automatically creates its first payment link/QR only for
  an eligible live reservation with no transaction or payment history.
- Reuse existing pending QR. Do not automatically retry failed/review/expired
  transactions. Attempt at most once per account/verification/hold expiry in
  the mounted screen, with GET reconciliation after an uncertain creation.
- Loading text says QR is being prepared. Leave a manual retry after failure.
  Do not open PayOS or treat QR creation as payment success.
- This request supersedes the earlier explicit-first-create requirement.

- Match compact registration: 1000px page, 16px card padding, 12–15px content,
  21px heading, 44px flat buttons and blue accents without shadows/gradients.
- Scheduling: calendar/slots left, current status and secondary actions right;
  stack on phones. Use valid shared icons; retain timezone, capacity, expiry,
  locks, reconciliation, pending/payment and assignment eligibility checks.
- Checkout: payment method/QR left, amount/package/meeting/hold summary right;
  stack on phones. Retain server amount/status, QR, controlled payment creation,
  polling and safe links. No payment API or business behavior changes.
- Plan: extend browser flow assertions; adjust existing layout/styles/icons;
  validate scheduling/checkout states and document results.
- Files: booking/checkout screens, hub icon catalog, booking/payment test mocks,
  registration browser fixture and handoffs.
- Verify: node --test --experimental-test-isolation=none
  tests/verification-booking.test.cjs tests/verification-payment.test.cjs;
  node tests/verification-registration-browser-check.cjs; focused ESLint/tsc.
- Browser: 320/375/768/1024/1440px, no horizontal overflow, compact actions,
  slot selection -> hold -> checkout -> automatic first QR, no duplicate POST,
  manual retry after failure, pending/paid/expired/review states and schedule locks.
- No new dependencies, no live payment operations; existing API fixture only.
