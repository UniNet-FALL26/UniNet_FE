# Profile identity photos

## Objective and acceptance
- Student personal information shows the entire cover without distortion, over a blurred copy filling spare space.
- Avatar and cover have accessible camera buttons at bottom right; selecting a supported photo uploads and saves it, cancelling changes nothing.
- Remove the UniNet student badge below nickname. Preserve other profile content and template navigation.

## Implementation plan
1. Update `StudentProfileStarter.tsx`: cover layers, unclipped avatar camera button, photo callbacks and busy state.
2. Wire existing picker/upload and portfolio editor save in `(tabs)/profile.tsx`; guard duplicate operations and abort on account/focus changes.
3. Verify component interactions, existing picker tests, TypeScript and responsive browser flow.

## Commands and conventions
`node --test tests/profile-identity-photos.test.cjs tests/profile-image-picker.test.cjs tests/student-profile-state.test.cjs`
`npx --no-install tsc --noEmit`
`node tests/student-profile-browser-check.cjs`

React Native / Expo Image, existing color tokens and StyleSheet; no new dependencies, API changes or unrelated edits. Tests use Node's test runner under `tests/`. Never modify secrets or vendor code.
