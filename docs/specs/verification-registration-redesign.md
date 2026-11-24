# Verification registration redesign

- Automatically select the sole eligible active Student/Verification package
  after loading. Clear stale selections when unavailable; preserve choice when
  still valid. Multiple-package and pagination support remain available.
- Present service/eligibility beside a registration summary on desktop and
  stacked on phones. Display actual API package name, price and duration.
- Use project blue, white surfaces, thin borders, plain icons and flat buttons.
  Remove decorative shadows; do not add gradients or 3D artwork.
- Preserve backend eligibility, pending-application resume, duplicate-submit
  locks, reconciliation, scheduling and checkout behavior. First CTA still
  selects a meeting; do not initiate payment or create an application on load.
- Plan: extend browser checks, implement auto-selection and registration panel,
  refine header/footer, verify then update booking handoff.
- Files: VerificationBookingScreen.tsx, VerificationRegistrationPanel.tsx,
  tests/verification-registration-browser-check.cjs, booking handoff.
- Verify: node --test tests/verification-booking.test.cjs
  tests/project-verification.test.cjs tests/verification-payment.test.cjs;
  node tests/verification-registration-browser-check.cjs; focused ESLint;
  node node_modules/typescript/bin/tsc --noEmit.
- Browser criteria: single package preselected without click, correct summary,
  no creation before CTA, correct create payload, schedule continuation,
  empty/inactive package blocks CTA, 320/375/768/1024/1440px without overflow.
- No API/payment/dependency changes; existing React Native/Expo UI conventions.
