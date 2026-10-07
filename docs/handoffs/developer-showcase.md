# Developer Showcase — template #02

## Integration
- Code/name: `developer-showcase` / Developer Showcase.
- Renderer: `src/components/profile/templates/developer-showcase/DeveloperShowcaseTemplate.tsx`.
- Theme tokens: `DeveloperShowcaseThemes.ts`, `mint` (Mint, default) and `orange` (Sunset Orange). Same component/data for both; all accents, hero panels/glow, text, borders, timeline and CTA follow tokens. Technology logos and media retain original colors.
- Registered in `src/data/profile-templates.ts`; `ProfileTemplateRenderer.tsx` dispatches from the existing card and `/profile/preview` route.
- Uses existing `PortfolioResponse` / `PortfolioContent`, `resolveProfilePreview`, **the same unchanged `src/data/profile-sample.json` as Developer Modern**, bundled profile media, skill resolver and link primitives. No API/schema/storage changes or extra dependencies.
- Preview links: `/profile/preview?template=developer-showcase&theme=mint` and `...&theme=orange`.

## Presentation
- Starts directly at Hero. No template sidebar, navbar, copied footer or semicircle. App preview header/back/colors remain owned by route.
- Desktop >=1024: text / portrait / code window; desktop journey horizontal. Four compact project cards and four skill/certificate columns when inner content >=900px.
- Tablet: text/portrait in two regions, statistics below; two project/skill/certificate columns and vertical journey.
- Mobile <768: title, bounded portrait, bio, wrapped skill chips, stacked actions, three statistics; one project column. Skills switch to two columns only with inner width >=350; certificates one column.
- Portrait: known transparent sample uses contain, ordinary user image uses framed cover, missing/failed source uses initials. Hero image eagerly loads; below-fold media lazy loads; thumbnails eagerly load with desktop composition.
- User revision: greeting and the full principles/featured-project block removed. The previous other-project section is now “Dự án của tôi”, includes all existing projects once, and uses compact four-column desktop cards without type overlays. Technology chips retained. Sections honor existing order/hidden preferences; hiding projects or other-projects hides the unified section. Empty articles and other empty sections produce no heading/spacing. Missing sample URLs never create project/article/certificate actions. Email CTA requires valid real contactEmail; current shared sample has no contactEmail, so previews omit email button. Existing sample social URLs are preserved.

## Files
New: template directory (DeveloperShowcaseTemplate, DeveloperShowcaseThemes, ShowcaseHero, ShowcaseSections, ProfilePortrait), ProfileTemplateRenderer, docs/specs/developer-showcase.md, this handoff, tests/showcase-render.test.cjs, tests/showcase-browser-check.cjs, tests/showcase-media-browser-check.cjs.
Modified: profile-templates.ts, ProfileTemplateCard.tsx, app/profile/preview.tsx, tests/profile-preview.test.cjs, tests/profile-browser-check.cjs (gallery title locator accepts shared sample appearing in multiple cards; stale nonexistent CTA selector now targets actual Modern footer).

## Verification
- `npx tsc --noEmit`: passed.
- `node tests/profile-preview.test.cjs`: 5 passed (deep links/defaults, shared data immutability and real data preservation).
- `node tests/showcase-render.test.cjs`: 5 passed (natural name separator, removed hero skill chips/project action, empty/hidden sections, initials, ordinary avatar vs cutout and AA contrast for both palettes). Image/symbol modules are boundary stubs; actual RN Web layout and components render server-side.
- `node tests/display-name.test.cjs`: passed.
- `npx expo export --platform web --output-dir dist/showcase-export`: passed, 57 routes.
- Showcase browser: mint/orange at **320, 360, 375, 390, 412, 430, 768, 1024, 1280, 1440**, plus landscape 812x375/reduced motion. Gallery/back, keyboard theme selection, selected deep links, portrait/name separation, natural name wrapping only when text exceeds available width, removed hero chips/project action, image/content bounds, no page overflow, no fake example actions and no page/console errors passed.
- Screenshots: `dist/showcase-verification` (ignored generated output); visually inspected desktop/mobile heroes, gallery and projects.
- `node tests/profile-browser-check.cjs`: passed; original Modern blue/amber preview, gallery, back, keyboard and overflow at 320/375/768/1440 remain working.
- `node tests/showcase-media-browser-check.cjs`: passed; intentionally aborted portrait request renders initials with no broken avatar/overflow.
- Browser/SSR checks are web verification; no physical iOS/Android device testing.
- Existing working tree had substantial unrelated tracked/untracked changes; preserved, no commit/publish.
