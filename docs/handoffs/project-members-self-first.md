# Project members: current user first

- projectDisplayMembers derives a display list with creator fallback when the
  API omits the owner; preserves existing creator role/record and other ordering.
- The viewer's profile ID determines which row moves first; account ID is not
  used. Owner flag covers profile identity being temporarily unavailable.
- Detail members tab adds “(Bạn)”; tab/panel/sidebar counts use the same active
  display list. Visitor identities are never fabricated as memberships.
- No backend writes or permission changes. Creator rows remain non-manageable.
- Focused tests cover owner fallback, stable ordering, no duplication/mutation,
  inactive membership counts, visitors and missing profile identity.
- Browser checks cover owner with empty list, existing owner row, preserved role,
  member self-first on mobile, visitor view and consistent counts.
- Commands: `node tests/project-members.test.cjs`,
  `node tests/project-links-browser-check.cjs` (Expo port 8084).
