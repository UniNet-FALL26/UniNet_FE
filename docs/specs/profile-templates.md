# Profile templates

## Objective and acceptance
- Preview header includes `Chọn mẫu này` to the right of the template name, opening the personal editor with selected template/theme. See `profile-template-editor.md` for the editor workflow.
- Developer Modern project cards show existing `technologies` as themed, wrapping chips below the description; omit the row for empty lists. Reuse `Chip` and verify desktop/mobile previews.
- One independent Developer Modern renderer, reusable registry of templates and named color tokens (blue, amber).
- Reference layout: navigation, cover/avatar hero, full name then nickname, featured projects, statistics, grouped skills, journey, other projects, certificates, articles, contact/footer. No decorative semicircles.
- Gallery cards render the actual template scaled from a desktop canvas and cropped at the bottom. Two columns on mobile. Name and selectable colors below, no category.
- Card or color opens `/profile/preview?template=developer-modern&theme=...`; selected color survives direct links. Preview is read-only.
- Bundled JSON uses PortfolioResponse fields from BE PortfolioContracts.cs, mapping to UserProfile and CareerProfile JSON columns. Never save example content to DB.
- Gallery/detail always use sample data, including for signed-in viewers. Only the personal editor fetches owner data; never supplement it with samples. API failure must allow retry.
- App continues to use existing nickname display helper.

## Stack, structure, style
Expo Router, React Native StyleSheet, expo-image, expo-symbols; reuse existing stack, no dependencies. Registry/data in `src/data`, models in `src/types`, pure preview resolution in `src/utils`, rendering in `src/components/profile/templates/developer-modern`.
Example: `getProfileTheme(templateId, themeId)`; typed props, semantic color tokens, accessible Pressable controls at least 44px.

## Ordered tasks
0. Keep preview sample-only; selection opens the personal editor. Verify mobile/desktop layouts and navigation.
1. Add contract, JSON and pure data/theme resolution; test empty, partial, full, deep-link defaults and immutability.
2. Build independent responsive template with bundled media and gallery thumbnail wrapper.
3. Keep gallery and read-only preview independent of the authenticated API.
4. Typecheck, focused Node tests, web export and browser checks; write handoff.

## Commands and verification
- `node tests/profile-preview.test.cjs` (in-process Node test runner; sandbox blocks child process isolation)
- `npx tsc --noEmit`
- `npx expo export --platform web --output-dir dist/profile-export`
- `npx expo start --web --port 8082`
- Browser: gallery/blue/amber, 320/375/768/1440 widths, crop, color navigation, back, keyboard, media/console.

## Boundaries
Preserve existing uncommitted work. FE only, no schema changes, no dependency installation, no publishing. Personal data editing is specified separately in `profile-template-editor.md`; admin editing and saving appearance remain future work.
