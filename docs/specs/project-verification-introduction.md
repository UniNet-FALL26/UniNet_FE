# Project verification introduction card

Replace the recruitment sidebar card in ProjectHubDetailScreen with a compact
verification introduction for all project modes. Explain expert feedback,
strengths/improvement opportunities and project portfolio credibility.

Only completed projects (status 2) show an action, and only to the owner, matching
VerificationBookingScreen authorization. Route to /group/verification/[projectId]
using the existing flow; no application/payment creation on card render or click.
Incomplete projects show a short completion prerequisite. Preserve recruitment
management elsewhere and all backend behavior.

Plan: verify card eligibility/navigation with focused render tests; build the
shared-style card and replace the sidebar block; check real-browser states,
navigation and mobile layout. No dependencies or backend changes.

Commands: `node tests/project-verification-card.test.cjs`,
`node tests/project-links-browser-check.cjs`,
`node node_modules/typescript/bin/tsc --noEmit`.
