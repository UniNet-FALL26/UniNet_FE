# Project media

- Objective: media upload is a borderless icon aligned with the panel title.
  Each item has an expand button and document-style action menu. Images use
  contain fitting. At viewport >=768px use two columns, below use one.
- Video list items are static placeholders; mount a controlled video player
  only inside the expanded preview and begin playback there. Closing unmounts it.
- Menu: info, preview, download; owner-only rename/delete with confirmation and
  errors. Preserve extension, metadata and every other project detail.
- Plan: add focused media panel/player, connect existing resource mutation lock,
  replace old resource rendering, extend browser fixture, verify and hand off.
- Files: hub media panel/player, shared file helpers, detail screen and browser
  fixture. Use current React Native/Expo Video/HubModal and color tokens.
- Validation: node tests/project-documents-browser-check.cjs; focused ESLint;
  node node_modules/typescript/bin/tsc --noEmit. Browser checks responsive grid,
  image fit, paused list, expanded playback lifecycle, mutations/permissions,
  preservation of documents and upload flow.
- Boundaries: no dependencies/API changes, safe resource URLs, same owner gates
  and existing upload endpoints. Missing metadata stays unknown.
