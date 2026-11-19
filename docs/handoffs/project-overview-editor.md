# Project overview editor and guidance

Updated 2026-11-16. Frontend only; existing owner-authorized details PATCH API.

- Underlined owner-only pencil at the overview card's top right opens a dedicated
  editor for introduction, problem/solution, objectives, features and expected
  results. Completed projects edit actual achievements instead; historical
  expected-result fields are retained. Summary/image/personal-review editors remain
  separate. Edit is disabled while a document/media addition is being persisted.
- Each section in both view/editor has an 18px blue exclamation button. Help explains
  purpose, concrete prompts and a labeled example; examples never populate data.
- Empty sections use specific writing prompts, including each expected-result tile.
- Pure draft builder validates API limits and preserves documents, media, links,
  dates and unrelated result fields without mutating the original project.
- All overview textareas grow/shrink to actual content, including wrapped lines
  and width changes. Native uses onContentSizeChange; web measures scrollHeight
  after resetting minimum height so deletion can shrink the field. Minimum 96px;
  the outer modal scrolls and keeps save/cancel visible.
- HubModal tracks its web stack and handles Escape on keyup in capture phase.
  React Native Web also closes modals on keyup; consuming that event prevents one
  Escape from closing both the help popup and the editor. Dialog roles and focus
  restoration are explicit.

Verification: 4 draft/validation unit tests passed. Full project/profile browser
checks passed: five guides, nested Escape/draft preservation, cancel/no writes,
save failure/retry/reload, retained files, owner-only edit, eight auto-growing
inputs, shrink, wrapping and mobile width changes. Image-modal regression passed.
Desktop screenshots inspected. Browser APIs use fixtures; no real DB/cloud writes.
TypeScript reports only known unrelated opportunities/assessor-post errors.

Spec: [project-overview-editor.md](../specs/project-overview-editor.md).
