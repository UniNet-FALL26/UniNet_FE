# Project members: current user first

Show the current user's membership first in the project detail members tab.
Include the creator as a project member even when the API members array omits
them. Preserve an existing creator entry and its role; do not duplicate it.
The fallback creator entry uses creator identity, project creation date and role
“Chủ dự án”. This is display-only and cannot open member management.

Match identities using account.profile.id, not account.id. Never add visitors as
members. Preserve remaining order and inactive membership information. Counts in
the tab, panel and sidebar use the same displayed active membership list.
Mark the current row “(Bạn)”. No backend, permissions or membership mutations.

Plan: focused utility tests; detail integration; browser empty-owner, member
ordering, counts and visitor scenarios. Commands:
`node tests/project-members.test.cjs`, `node tests/project-links-browser-check.cjs`,
`node node_modules/typescript/bin/tsc --noEmit`.
