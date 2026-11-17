# Project classification removal and recent update

- Removed Origin/Mode from project API types, draft confirmation and assessor consumers.
- Removed creation type selector and detail type/source badges and rows. Recruitment and member access use actual state.
- Recent update reads API updatedAt in Vietnam time; successful edits replace project state from API.
- Focused hub/timestamp tests: 8 passed against staged sources; staged TypeScript syntax checks passed. Browser checks on port 8090 passed against the working tree, including updated timestamp after save/reload.
- FE typecheck has unrelated errors in opportunities.tsx and AssessorProfilePosts.tsx, documented in the backend handoff.
- Commit is scoped separately from pending friendship UI, link editor, verification card, technology picker and modal styling changes.
- Backend migration and database verification: UniNet_BE/docs/handoffs/remove-project-classification.md.
