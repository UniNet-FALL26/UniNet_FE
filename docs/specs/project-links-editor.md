# Project links editor

Objective: add an owner-only pencil at the links panel's upper right. Open a
compact shared HubModal with existing links or one blank row, labeled name/URL
inputs, add/remove, Cancel and Save. Cancel discards drafts; failures retain them.
Save updates the panel from the returned project and preserves other details.

Contract: existing PATCH project-hub/:id, details spread plus links. Match backend
limits: 30 links, required label <=100 characters, HTTP(S) URL <=2048 characters,
no embedded credentials. Empty list is valid; incomplete rows block saving.

Stack/style: Expo React Native TypeScript; reuse HubModal, HubAction and
ProjectPencilButton. Example: `{ details: { ...project.details, links } }`.
No backend/schema/dependency changes. Only project owner may open the editor.

Link types: replace free-text labels with a selectable catalog: GitHub,
Website / Demo, Figma, Google Play, App Store, API (Swagger), Khác. Save the
exact catalog label through the existing contract. Share catalog/icon resolution
between picker and sidebar. Unknown legacy labels retain a generic icon when
viewed and map to Khác when edited. Selection is required; keep URL validation.
Use local vector icons and existing Expo Image; no remote logo dependency.
Verify selection, exact saved labels, icons after reload, cancel/retry and mobile.

Plan: (1) normalization tests and utility in src/utils; (2) editor in
src/components/projects/hub and detail integration; (3) tests, typecheck, lint,
browser verification of cancel, validation, retry, save/reload and owner gating.

Commands: `node tests/project-links.test.cjs`, `node tests/project-links-browser-check.cjs`, `npx tsc --noEmit`,
`npx eslint src/utils/project-links.ts src/components/projects/hub/ProjectLinksModal.tsx src/components/projects/hub/ProjectHubDetailScreen.tsx`,
`npx expo start --web --port 8084`.
