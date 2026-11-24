# Responsive project documents

## Upload and row layout refinement
- Replace upload CTA with a borderless 44px icon button on the title row at
  every width; keep its accessible name, busy state and permission checks.
- Compact files are flat rows with bottom separators, without card outlines.
- Verify title/button alignment, row separators and existing upload flow in
  the browser fixture at all five viewport widths.

## Compact list refinement
- Compact rows show only file icon, wrapping filename and action menu.
- Move format, size, uploader/avatar and upload date into a read-only
  “Thông tin tài liệu” modal opened with menu action “Xem thông tin”.
- Keep desktop columns and selection; compact view omits bulk-selection controls.
- Verify metadata hidden in compact list, information popup for owners and
  readers, missing metadata, close/reopen and existing document operations.

- Objective: student project documents fill the card with equal side insets;
  narrow panels show a readable vertical list without horizontal scrolling.
- Scope: ProjectDocumentsPanel.tsx, ProjectDocumentMenu.tsx and existing browser
  fixture. Keep current upload, selection, pagination and permission behavior.
- Stack/style: React Native Web, existing hub colors and controls. Example:
  `style={[s.footer, compact && s.mobileFooter]}`.
- Plan: extend fixture layout assertions; replace horizontal table scroller with
  full-width table / compact list based on available panel width; verify and
  update docs/handoffs/project-documents.md.
- Acceptance: table reaches both card insets; at 320/375/768px file names wrap,
  metadata remains visible, actions fit viewport and controls have 44px targets.
  Desktop at 1024/1440px retains columns where the panel is wide enough.
- Verification: `node tests/project-documents-browser-check.cjs`;
  `node node_modules/typescript/bin/tsc --noEmit`;
  `node node_modules/eslint/bin/eslint.js src/components/projects/hub/ProjectDocumentsPanel.tsx src/components/projects/hub/ProjectDocumentMenu.tsx`.
- Boundaries: no API/dependency changes, no unrelated edits; retain existing
  guarded mutations and dialogs. Browser fixtures mock external APIs only.
