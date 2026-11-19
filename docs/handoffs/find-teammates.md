# Find teammates

- Route: /(tabs)/find-teammates (URL /find-teammates). Student header and mobile
  discovery menu use the same "Tìm đồng đội" shortcut in app-tabs.shared.tsx.
- FindTeammatesScreen uses existing projectHubService.discover(page, q), 12/page.
  Backend already filters open, unexpired postings on active/pending projects.
  Search retains server semantics (project title/description). No backend change.
- RecruitmentPostCard displays creator, short intro, position quantities,
  competencies and UTC+7 deadline. Responsive two-column/one-column grid.
- RecruitmentPostDialog fetches fresh project + user's requests before rendering
  the shared read-only overview. Missing/closed posts, owners, active members and
  pending applicants cannot apply. Deadline timer removes apply at expiration.
- ApplyProjectModal submits existing requestType=0 endpoint with selected position
  and message. Success returns to overview/pending state; reopening reloads saved
  requests. Backend remains authoritative for capacity, conflicts and permissions.
- Overview now accepts optional management callbacks and a footerAction slot.
  Browsing omits owner management callbacks. Existing owner editor flow preserved.
- Abort requests on focus/unmount/query changes; account/page/search keyed results
  prevent stale content. Loading, retry and empty states included.
- Verified Chrome desktop/mobile: header/menu and active state, search/page,
  empty/retry, fresh closed posting, owner/member gating, exact application body,
  pending after reopen and Escape. Screenshots inspected at 1440/375; no overflow
  at 1024/375. TypeScript errors only in unchanged opportunities/assessor files.
- Commands: FIND_TEAMMATES_TEST_ORIGIN=http://localhost:8095
  node tests/find-teammates-browser-check.cjs; node node_modules/typescript/bin/tsc
  --noEmit. Fixtures render real client bundle with mocked API, not production data.
- Existing uncommitted recruitment/settings work remains. No deployment or commit.
