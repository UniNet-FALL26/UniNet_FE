# Project detail tab spacing and settings

Move the detail tab bar 20px below the introduction. Add a gear-labeled Settings
tab after Media for project owners/active members. Public visitors do not see it.
Use the existing compact cards/actions and API authorization.

Settings provides owner-only private/public visibility selection and an explicit
save that PATCHes only visibility. Private is disabled while recruitment is open,
matching the backend rule. Management actions (complete/delete for owners, leave
for members) move from the bottom of the overview into Settings and retain their
existing confirmation dialogs. No schema/backend changes or new dependencies.

Verify tab placement, settings selection, visibility save/reload, action dialogs,
visitor restrictions and 320/768/1024/1440 layouts with the project/profile and image
browser checks. Run `npx tsc --noEmit`; keep known unrelated errors documented.
