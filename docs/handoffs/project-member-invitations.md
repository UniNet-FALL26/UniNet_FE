# Unified member invitations

- Members panel exposes one owner-only “Lời mời” action, right-aligned with its
  title using HubPanel.action. Previous two standalone actions removed.
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
