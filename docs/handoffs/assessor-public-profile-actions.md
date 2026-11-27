# Assessor public profile viewing disabled

- User follow-up removes public assessor profile viewing. Community author clicks resolve the public role before navigating: other assessor authors stay in the feed, and their author control becomes inert after resolving. Other roles keep public profile navigation. Requests are locked/canceled to prevent duplicate or stale navigation.
- Direct public assessor profile links redirect to the viewer's home, or to the existing private profile for the assessor themself. Own-author clicks still open the existing private assessor profile.
- The previous student-friendship fix remains: relationship lookup/actions require both profiles to be students. No backend access or friendship rules changed.
- Regression: `node tests/assessor-profile-view-disabled-browser-check.cjs` passes author-click blocking, direct-link redirects and student friendship controls at 1440/375px. `node tests/community-author-profile.test.cjs` covers assessor blocking, student/partner routing, private own-profile routing and request cancellation. `node tests/friend-profile-actions.test.cjs` preserves role-aware friendship behavior.
- CommunityPostCard ESLint passes. Existing effect-setState lint diagnostics in the generic public viewer remain outside this change.
