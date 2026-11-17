# Student friendships and project invitations

## Entry points and permissions
- `/profile/friends` reuses the existing profile layout. Header tab Bạn bè sits
  immediately after Dự án; horizontal scrolling keeps it visible on mobile.
- Only active Student accounts may use friendships. Backend controller role
  authorization and service database-role checks both enforce this. Search,
  requests and relationships exclude non-student targets. Frontend route/actions
  also hide/redirect for other roles.
- Public student profile `/profile/view/[id]` uses FriendProfileActions. Buttons
  reflect actual relation and confirm before unfriend. Focus, notifications and
  mutation completion refresh state; uncertain failures reconcile with GET.

## Contracts and invariants
- `friendship.service.ts`, `types/friendship.ts`; backend specification:
  `UniNet_BE/docs/friendships.md`.
- Friendship participants/notification recipients are Account IDs. Public profile
  lookup and project invitation payloads use Profile IDs. DTO contains both.
- One EF table Friendships, unique computed unordered account pair, self/status
  checks, restrictive Account foreign keys, directional list indexes and Version.
- PG pair advisory locks + expected client Version prevent concurrent duplicates
  and stale actions on resent requests. Same/reverse sends return 409, never
  implicitly accept. Notifications and delivery outbox commit atomically.
- Notification targets resolve participant-owned Friendship notifications to
  `/profile/friends`; safe frontend path allowlist includes that exact route.

## Project integration
- ProjectFriendInviteModal lists/searches eligible friends and selects one person.
- Owner-scoped candidate queries exclude creator, active project members and
  pending project invitees. Only a position name is required; no message or
  recruitment details. Uses the existing invitation endpoint with a role payload.
  Failures retain the selection for retry; mutations stop on session change.
- Direct invitations need no recruitment. Only owner + Pending/Active/Completed
  project + active accepted student friend can
  send. Applications retain recruitment rules.
- Friendship acceptance never creates ProjectMembers. Project invitations still
  require recipient acceptance through the existing request decision flow.
  ProjectReceivedInvitation exposes accept/reject on project detail.
- PersonAvatar extracted unchanged to share without circular imports; existing
  ProjectCommunityModals export retained for compatibility.

## Migration and verification
- Migration `20261117032216_AddFriendships` + model snapshot in UniNet_BE.
  Full migration chain tested against an isolated PostgreSQL 18 database; no
  shared/application database was migrated during that verification. The configured
  Neon database now includes this migration and RemoveProjectClassification;
  see remove-project-classification.md for the current database state.
- Backend focused/regression suite: 60 passing, including real HTTP JWT/role/DTO
  binding, all non-student roles, stale role/version, candidate filters, PostgreSQL
  same/reverse-send and accept/cancel races, notification rollback, project and
  notification regressions.
- Client service/notification/project API tests: 21 passing.
- Additional backend NotificationsHttpTests regression suite: 12 passing.
- Backend solution build and frontend production web export both passed.
- `tests/friendships-browser-check.cjs`: friend actions and confirmation, profile
  buttons and uncertain-response recovery, header order, mobile, pagination clamp,
  non-student route/action denial, single friend invite without recruitment,
  pending status and recipient accept/reject with membership created on acceptance.
- Typecheck reports existing errors only in `(tabs)/opportunities.tsx` and
  `components/assessor/AssessorProfilePosts.tsx`; do not conflate with this feature.
- Build commands: backend `dotnet build UniNet.sln --no-restore -m:1`;
  frontend `npx expo export --platform web --max-workers 2 --output-dir dist/friendships-check`.
- Backend tests use `UNINET_TEST_POSTGRES` only for an isolated test database.
  Browser origin override: `FRIEND_TEST_ORIGIN` (default localhost:8084).
- Final browser checks passed on Expo localhost:8086 for both
  `friendships-browser-check.cjs` and `project-links-browser-check.cjs`.
  Set FRIEND_TEST_ORIGIN / PROJECT_LINKS_TEST_ORIGIN to use that server.
