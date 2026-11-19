# Project technologies

- Detail sidebar resolves stored technology names against `/profile/skills` and displays catalog images with `expo-image` (contain). Missing/failed images retain a small fallback icon and the name.
- Owner-only underlined pencil opens `ProjectTechnologiesModal`: search, select/remove catalog items, add custom names, cancel/save. Existing names and punctuation remain supported.
- Save PATCHes only `technologies`; errors retain selection and allow retry. Normalization deduplicates names ignoring case/whitespace, with limits of 20 names / 80 characters each.
- Shared `ProjectPencilButton` now serves title, overview, personal review and technologies. Backend contract unchanged.
- Validation: 3 normalization tests; browser integration covers actual image elements, cancel, catalog/custom selection, failed-save retry, reload and unchanged summary/overview. Image regression covers non-owner restrictions. Both browser suites pass using mocked APIs.
- TypeScript has existing unrelated diagnostics in `opportunities.tsx` and `AssessorProfilePosts.tsx`; no diagnostics in changed technology components.

- Popup simplified: begins with search, a single selectable grid with blue/white backgrounds and no trailing plus/check icons. Stored custom names remain in the grid so they can be deselected.
