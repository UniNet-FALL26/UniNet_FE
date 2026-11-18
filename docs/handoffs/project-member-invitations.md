# Unified member invitations

- Members panel exposes owner-only “Lời mời”. “Tuyển” now lives inside
  that popup, to the right of “Mời” on the same row. Its owner/status
  conditions are unchanged. Below 800px both popup buttons are 30px with no icons.
  Closing/cancelling/saving recruitment returns to the invitations popup.
- The recruitment action is always labeled “Tuyển”, whether creating
  or managing recruitment. Public applicant action remains in the project hero.
- ProjectRequestsModal renders the complete requests response in one list;
  per-row “Xin tham gia”/“Được mời” labels replace the old filter tabs.
- Existing status/accept/reject/cancel handlers and API contracts are preserved.
- “Mời thành viên” now lives inside the list modal. Invite cancel/success returns
  to the unified list and remount reloads its data. Completed-project restriction
  on sending invitations remains unchanged.
- Browser checks cover mixed request types, header alignment, all decisions,
  invite cancel/send/refresh, empty state, mobile layout and owner gating.
- Typecheck has existing opportunities.tsx/AssessorProfilePosts.tsx errors; no
  errors in changed components. No backend or dependency changes.
- Command: `node tests/project-links-browser-check.cjs` with Expo on port 8084.
