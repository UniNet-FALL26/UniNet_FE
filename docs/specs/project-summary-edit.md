# Project title and short introduction editor

The owner-only pencil beside the project title opens a compact popup containing
only Title (required, 200 characters) and Short introduction (required, 500
characters), with Cancel and Save. Save PATCHes only title/description. Cancel
does not write; errors preserve input and allow retry. Successful save refreshes
the detail title/short introduction and the project card when returning to the list.

Remove EditProjectModal and its old tabs/entry points. Document/media additions
use their own file picker and existing upload/PATCH APIs, never the summary popup.
Keep project images, detailed introduction, status, technologies and other fields
unchanged when saving the summary. Existing backend owner authorization applies.

Implementation: ProjectSummaryModal, ProjectHubDetailScreen integration, focus
refresh in ProfileProjectsPanel. No dependencies, backend changes or migrations.
Verify with `node tests/project-hub-service.test.cjs`,
`node tests/project-cards-profile-browser-check.cjs`,
`node tests/project-image-browser-check.cjs` and `npx tsc --noEmit`.
