# Project overview editing and writing guidance

Owner-only underlined pencil at the top right of the overview card opens a compact
editor for introduction, problem/solution, objectives, features and expected results
(actual achievements for completed projects). This is separate from summary, image
and personal-review editing. Save PATCHes details only and preserves documents,
media, links, dates, unrelated result fields and other project properties.

Each heading has a small blue circular exclamation button. Its help popup explains
purpose, concrete writing prompts and an explicitly labeled example. Include the
same help beside editor headings; closing nested help must preserve editor input.
Empty view sections and editor placeholders explain what to add and why.

All editor textareas must grow and shrink with actual rendered lines (including
wrapping and viewport changes), with no internal vertical scrolling. Keep a compact
minimum height and the outer modal's fixed save/cancel footer.

Plan: shared guide/validation data and unit tests; guidance popup/section headings;
overview editor; owner/view integration; browser checks for every guide, nested
Escape/focus, cancel/no writes, field preservation, save/retry/reload and mobile.
Use existing APIs, owner authorization and compact UI. No migrations/dependencies.
Commands: `node tests/project-overview-content.test.cjs`,
`node tests/project-cards-profile-browser-check.cjs`, `npx tsc --noEmit`.
