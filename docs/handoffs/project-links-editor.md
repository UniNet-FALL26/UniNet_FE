# Project links editor

- Owner-only ProjectPencilButton on the detail sidebar links panel opens
  ProjectLinksModal. Uses shared HubModal keyboard/focus handling and design.
- Editable draft rows support add/remove, Cancel, Save, busy guard and inline
  errors. PATCH existing project-hub endpoint with spread details plus links;
  saved response updates the panel. Other details are preserved.
- project-links utility validates trimmed labels/URLs against backend limits:
  30 links, 100-character label, 2048-character HTTP(S) URL, no credentials.
- Verified normalization and Playwright fixtures: incomplete rows, cancel,
  failed save/retry, persistence after reload, deletion and owner gating.
  Browser checks also cover keyboard focus/Escape and responsive sizes.
- `node tests/project-links.test.cjs`; `node tests/project-links-browser-check.cjs`
  (Expo on port 8084; override PROJECT_LINKS_TEST_ORIGIN as needed).
- Typecheck has existing errors in opportunities.tsx and
  AssessorProfilePosts.tsx; no errors in changed files. ESLint unavailable in
  installed dependencies; npx fallback failed with ENOTCACHED.

## Link type catalog

- Replaced free-text names with ProjectLinkTypePicker: GitHub, Website / Demo,
  Figma, Google Play, App Store, API (Swagger), Khác. Saves exact catalog labels
  as existing HubLink.label, without backend contract changes.
- projectLinkTypes/getProjectLinkType in project-links.ts provide one source for
  labels and icon lookup. ProjectLinkIcon renders both picker and sidebar icons
  using local assets/Expo symbols. No remote asset requests or new dependencies.
- Legacy custom names display with a generic icon; editing maps them to Khác.
- Verified all seven choices/icons, selected state, Enter selection, canonical
  saved labels and sidebar icons after reload; existing URL, cancel, retry,
  deletion, owner and responsive checks still pass.
