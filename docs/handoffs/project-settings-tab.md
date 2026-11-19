# Project detail settings tab

Updated 2026-11-16. Frontend only; no migration/backend changes.

- The tab bar has 20px top spacing below the introduction.
- Settings appears after Media for owners/active members; visitors cannot see it.
- Owners can save private/public visibility, PATCHing only visibility. Private is
  disabled while recruitment is open, consistent with the existing API rule.
- Complete/delete/leave actions moved into Settings and retain confirmation dialogs.
- Uses the existing compact panels/buttons. Sidebar settings on the profile page
  and title/short-introduction editing are unchanged.

Browser checks passed for spacing, settings tab, visibility save/reload, canceling
delete, responsive widths and hiding settings from visitors. Project image workflow
regression also passed. API responses were intercepted fixtures; no real writes.
TypeScript reports only the previously known unrelated errors.

Spec: [project-settings-tab.md](../specs/project-settings-tab.md).
