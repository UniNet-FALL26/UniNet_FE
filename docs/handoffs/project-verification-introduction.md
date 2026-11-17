# Project verification introduction

- ProjectVerificationCard replaces the recruitment sidebar block in
  ProjectHubDetailScreen for both personal and community projects.
- Introduces expert feedback, strengths/improvements and portfolio credibility.
  Unfinished projects show a completion prerequisite. Completed owners see
  “Thẩm định dự án”; visitors and members cannot register for the owner.
- CTA navigates to /group/verification/[projectId], reusing the existing booking
  flow's backend eligibility, pending dossier resume, packages and payment flow.
  Rendering/clicking the card does not create a verification or payment.
- Recruitment flows in settings/header remain unchanged.
- Verified: focused card tests; browser states 0/1/2/3, personal/community,
  non-owner gating, removed recruitment card, mobile/desktop snapshots and
  actual navigation into the existing booking screen using mocked GET responses.
- Typecheck still reports existing opportunities.tsx/AssessorProfilePosts.tsx
  errors; none in this change. No backend changes or external writes.
- Tests: `node tests/project-verification-card.test.cjs`,
  `node tests/project-links-browser-check.cjs` (Expo port 8084).
