# Project summary editor

Updated 2026-11-16. Frontend only; no backend/schema changes.

- Pencil beside the title opens `ProjectSummaryModal`, with exactly two required
  inputs: name (200 characters) and short introduction (500 characters).
- Save PATCHes only title/description; image, detailed content, status and other
  project data remain untouched. Cancel writes nothing. Errors preserve input;
  busy state blocks duplicate saves and closing during persistence.
- Removed `EditProjectModal` and all its entry points. Document/media Add buttons
  now open their file pickers and use existing uploads/details PATCH directly,
  without opening the summary popup. They remain usable after adding a file.
- Project list reloads on focus so renamed projects show updated cards on return.
- Summary saves close quietly without a success banner. Owner-only pencil remains.
- Short introduction uses the shared AutoGrowingTextInput: compact 64px minimum,
  grows/shrinks with actual rendered lines and keeps the 500-character limit.
  Overview textareas use the same component with their original 96px minimum.

Verification: 6 frontend service tests passed. Browser project/profile checks passed
for two-field editing, validation, cancel, failed-save retry, header/list updates,
document/media additions and responsive layouts. Image workflow regression passed.
APIs were intercepted fixtures; no real database/cloud writes. TypeScript reports
only pre-existing opportunities.tsx and AssessorProfilePosts.tsx errors.

Spec: [project-summary-edit.md](../specs/project-summary-edit.md).
