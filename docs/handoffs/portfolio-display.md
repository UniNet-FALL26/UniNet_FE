# Portfolio template, theme and display

Implemented 2026-10-11. Student scope only; company flow unchanged.

## Cause and behavior

Editor previously rendered route template/theme without adding them to the saved payload. Dirty state tracked edit events rather than the complete payload. Now catalog-resolved selection is part of the draft; identity, content and appearance are compared canonically against the last successful server response. Appearance-only changes save; full revert clears dirty; failures preserve drafts. Gallery/preview remain demo-only, selection never auto-saves. Palette, back and template navigation lock during saves; unsaved departure supports cancel/discard, including navigation removal and web unload. Editor hydrates a stable web loading shell before displaying query-selected appearance, matching preview behavior and preventing static-export hydration mismatch on direct editor URLs.

Settings persist display independently. Own tab uses `showPortfolio !== false && hasContent`; legacy unset preference defaults to content availability. Off preserves content, selected appearance and privacy; editing remains available. Visitor route uses real public/authorized reads and has no editing actions. Backend removes disabled/hidden data before returning nonowner responses; existing private-profile access remains enforced. Viewer cache is scoped to current auth identity and refreshed on focus.

## Storage and HTTP contracts

Existing `CareerProfiles.AppearanceJson.profile.showPortfolio` stores nullable bool. No table, column, migration or dependency added. `isPublic` retains its existing meaning. Legacy Modern `orange` resolves to `amber`.

All paths below are under `/api`:

- `GET /profile/portfolio/me`: authenticated own `PortfolioResponse`.
- `PUT /profile/portfolio/editor/me`: `{ profile: { fullName, nickname, avatarUrl, coverUrl, bio }, portfolio: PortfolioContent }`; `portfolio.appearance.profile.template/theme` is validated and saved with content atomically. Canonical saved response becomes baseline. Editor writes deliberately preserve the database display preference to avoid overwriting settings from another device.
- `PUT /profile/portfolio/display/me`: authenticated Student, `{ "showPortfolio": true|false }`; updates only appearance preference, returns `PortfolioResponse`. Missing/null field is invalid. Client-supplied owner IDs are not used.
- `GET /profile/portfolio/{UserProfile.Id}`: existing active/public-or-owner policy, student role only; owner receives full data, visitors receive filtered content. Disabled response contains only basic identity and empty portfolio; private denial remains 404.

Themes: Modern `blue/amber`; Showcase `mint/orange`; Landscape `blue/pink/mint`. Unknown combinations rejected before identity/content writes. Unknown existing appearance keys are preserved.

## Files

FE: `src/app/profile/editor.tsx`, `src/app/settings.tsx`, `src/app/(tabs)/profile.tsx`, `src/app/profile/view/[id].tsx`, `src/components/profile/StudentProfileStarter.tsx`, `src/utils/profile-draft.ts`, `src/utils/student-profile.ts`, `src/data/profile-templates.ts`, `src/services/portfolio.service.ts`, `src/types/portfolio.ts`.

BE: `UniNet.Application/DTOs/Auth/PortfolioContracts.cs`, `UniNet.Application/Services/PortfolioService.cs`, `UniNet.API/Controllers/ProfileController.cs`.

Tests: FE `profile-draft.test.cjs`, `student-profile-state.test.cjs`, `profile-fields.test.cjs`, `landscape-render.test.cjs`, `profile-editor-browser-check.cjs`, `portfolio-display-browser-check.cjs`; BE `PortfolioDisplayTests.cs`, `PortfolioHttpTests.cs`, legacy normalization expectations in `PortfolioProductionTests.cs`.

## Verification and limits

Backend suite: 78 passing tests. HTTP tests start production controller/service with real JWT authorization and a temporary persisted SQLite database; verify write/read in fresh DbContext/client, all theme pairs, toggle preservation, stale-editor preference isolation, visitor filtering, private denial, invalid payloads, unauthorized requests and another account's inability to target the owner. No production database touched.

FE unit checks: profile-draft, student-profile-state, profile-preview, profile-editor, profile-fields, profile-edit-layout, showcase-render, landscape-render, landscape-data. TypeScript `npx tsc --noEmit`; production web export `npx expo export --platform web --output-dir dist/portfolio-display-build`.

Browser results: both editor regression and complete new flow passed against the final exported production build served locally at 8084 using `PROFILE_TEST_ORIGIN=http://localhost:8084`; run `node tests/profile-editor-browser-check.cjs` and `node tests/portfolio-display-browser-check.cjs`. Editor regression also passed against Metro at 8083 earlier. The new flow covers appearance-only saves/revert, gallery cancel/discard, content retention, save failure/retry and in-flight locks, reload with reauthentication, display off/on and retry, another signed-in page reading saved values, read-only visitors, private denial/retry, settings load retry, responsive layouts and no page errors. Metro reload waits were unreliable; production testing avoids dev bundling waits. Browser API fixtures test UI behavior; database persistence evidence comes separately from real backend HTTP tests. Responsive checks cover 320/768/1024/1440px. Browser evidence lives in ignored `dist/portfolio-display-verification`. Fetch effects in settings/viewer are separate from stable focus refresh callbacks so explicit retry reliably issues another request. Save-lock checks use a deferred response gate, without timing-based sleeps.

Current auth credentials are memory-only by existing design: reload/new device requires signing in again; tests follow this behavior rather than changing auth. PostgreSQL integration, physical iOS and native Back across all three templates have not been tested; see the Android fix below for Modern color/Back device verification. `CI=1 npx expo lint` exited 1: no ESLint config; automatic configuration failed with `ECONNREFUSED 127.0.0.1:9` under restricted networking. No lint dependencies/config files were added. Direct student visitor route is available; unrelated lists/demo company applicant routes have not been rewired.

## Android color-change fix

Device logs reported `TypeError: undefined is not a function` when changing an editor color. React Native exposes `window` as a global alias but has no browser `addEventListener`; the unload effect first ran when the draft became dirty. Gate that effect with `Platform.OS === 'web'`; retain `usePreventRemove` for native navigation. `tests/profile-editor-unload.test.cjs` reproduces the failure with Android/iOS window aliases before the fix and passes after it, while verifying web unload registration/cleanup and clean drafts. Draft tests, TypeScript, production web export and the complete production browser flow passed after the fix. On the attached Android device, Modern blue -> amber changed the selected palette and enabled Save without a render error; hardware Back opened the unsaved confirmation. Cancel/revert restored blue and the clean baseline. No real profile save was performed.
