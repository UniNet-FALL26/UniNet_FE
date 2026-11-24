# Project media

- ProjectMediaPanel replaces the old ResourcesPanel/Resource rendering.
- Borderless upload icon stays on the heading row. Grid uses two equal columns
  from 768px and one on phones. Image thumbnails and expanded images use contain.
- Expand button and document-style menu sit side by side on every item.
  Menu supports info/preview/download plus owner rename/delete. Names retain the
  extension; metadata is preserved. Deletes require confirmation and support retry.
- Grid videos use static placeholders with no video element/player mounted.
  Expanded preview mounts ProjectMediaPlayer: native Expo Video with controls;
  web HTML video with autoplay/controls/contain. Closing unmounts the player.
- Parent updateResources reuses the upload/mutation lock and patches only media
  or documents inside existing details, retaining all unrelated project fields.
- ProjectResourceFiles shares existing size/date/download helpers with documents.
  ProjectDocumentMenu adds an optional deleteLabel for media wording.
- Verification: document/media Chrome fixture passed at 320/375/768/1024/1440px:
  heading alignment, grid columns, image fit, info, upload/download, rename,
  delete error/retry, permissions and preservation of other details. A real
  3-second WebM verifies automatic playback only in expanded preview and removal
  on close. Screenshots inspected. No page errors.
- Focused ESLint clean; detail screen retains two pre-existing hook warnings.
  Full TypeScript still reports only existing opportunities.tsx and
  AssessorProfilePosts.tsx errors. Native simulator was not run.
- Run: `node tests/project-documents-browser-check.cjs` with Expo on port 8086.
