# Project image selection and display

Updated 2026-11-16. Implemented locally; no deployment or schema changes.

- Owner-only 30px camera button at the top right of the detail cover.
- `selectProjectImage` reads a local PNG/JPG up to 5 MB without network writes.
  `ProjectImagePreviewModal` supports reselect/cancel/confirm. Confirm is disabled
  until the preview loads. Confirm uploads through the authenticated `/api/images`
  endpoint, then PATCHes only `logoUrl` through `/api/project-hub/:id`.
- The saved image remains until persistence succeeds. Upload failures do not
  PATCH. Database failures retain the uploaded URL for retries without a duplicate
  upload. Close/reselect are disabled while saving; temporary blob URLs are released.
  File selection is discarded if the detail route/account changes.
- `FullProjectImage` uses Expo Image contain sizing for the complete foreground
  image and a blurred cover of the same source behind it. Used by project covers,
  preview, list cards and all three portfolio templates, including local SVG samples.
- Backend `PortfolioService.ProjectReferences` now maps `Projects.LogoUrl` into
  `PortfolioProject.CoverUrl`; linked portfolio references keep the current image
  without storing copied URLs in portfolio JSON.

Verification: 6 selection/upload unit tests, 5 frontend service tests, and 13
backend portfolio/project tests passed. Browser checks passed for reselect/cancel
without writes, upload-before-PATCH, upload and database failures, retry without
re-upload, persistence on reload, contain/blur in detail/list/profile, and hiding
the camera for non-owners. Existing project/profile browser regression also passed.
Browser APIs/Cloudinary responses were intercepted fixtures; no real test uploads
or database writes were performed. TypeScript reports only the pre-existing errors
in `(tabs)/opportunities.tsx` and `assessor/AssessorProfilePosts.tsx`.

Spec: [project-image-preview.md](../specs/project-image-preview.md).
