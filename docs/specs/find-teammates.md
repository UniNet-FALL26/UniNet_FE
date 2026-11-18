# Find teammates

## Objective and contract

- Add "Tìm đồng đội" to student desktop header and mobile discovery menu.
  Route /(tabs)/find-teammates uses the existing authenticated student shell.
- List actual open, unexpired recruitment posts using GET project-hub/discover
  (page/pageSize/q). Keep server search semantics: project title/description.
- Show project title/logo, recruitment introduction, creator, positions, required
  competencies and Vietnam-time deadline. Search, pagination, loading, empty and
  retry states reuse existing blue/white project styles.
- View posting in read-only recruitment overview; fetch fresh project and current
  user's requests before showing apply. Reuse ApplyProjectModal and existing POST
  requests endpoint. Block owner/member/pending applications and expired postings.
- Confirmed application returns to overview with pending status. Viewer also
  links to project details. No draft, API/schema/dependency changes or deployment.

## Implementation plan

1. Add browser fixture covering header/menu navigation and actual API contracts.
2. Add route, listing/card and read-only viewer with application flow.
3. Connect desktop shortcut and mobile menu; verify active header state.
4. Run browser regression, TypeScript and diff review; document handoff.

## Structure and conventions

- src/components/projects/hub: listing, post card, dialog; existing HubAction,
  HubModal, ProjectRecruitmentOverview and ApplyProjectModal.
- src/app/(tabs)/find-teammates.tsx: route; app-tabs.shared.tsx: navigation.
- Existing React Native/Expo Router conventions, e.g.
  `<HubAction title="Xem bài tuyển" onPress={open} />`.
- Accessibility: labeled navigation/search/actions, focus/Escape via HubModal,
  responsive wrapping and no horizontal overflow at 375/1024/1440px.
- Abort requests on unmount/account/query change; avoid displaying stale results.

## Validation

- `node tests/find-teammates-browser-check.cjs`
- `node node_modules/typescript/bin/tsc --noEmit`
- `git diff --check`
- Chrome fixture: browse/search/page, empty/retry, intro/positions/deadline,
  fresh closed post, application position/message/body, pending after reopen,
  owner/member gating, desktop header/mobile menu and keyboard dismissal.
- Preserve existing uncommitted recruitment/settings work. Never use mock data in
  production; fixture data is isolated to tests. Server enforces join permissions.
