# Developer Landscape

## Delivered
- Personal projects refinement: displayed heading is `Dự án bản thân`; project type badges remain removed. Cards show `Công nghệ sử dụng: …` as plain text below descriptions, omitted for empty technology lists. Section widths ≥900px use four columns, ≥600px use two, otherwise one. Covers, titles, descriptions, links and the internal `other-projects` key remain. Focused render tests, TypeScript and web export pass; project screenshots are saved as `dist/landscape-verification/projects-{theme}-{width}.png`.
- Third registry entry `developer-landscape`; default Blue Mountain (`blue`), Pink Sunset (`pink`), Mint Forest (`mint`). Same component/data for all three; gallery and preview theme controls discover the entry automatically.
- Main component: `src/components/profile/templates/developer-landscape/DeveloperLandscapeTemplate.tsx`. Reuses `PortfolioResponse`, existing preview resolution, media aliases, chips, link controls and brand logo assets. Existing template components remain unchanged.
- Hero/reference 1–2: left identity/nickname/headline/bio, central portrait, right decorative quote and code, bundled layered mountain/city/forest SVG scenery. The 2026-10-04 refinement removes hero skill chips, contact/project buttons and social links. Latest refinement removes the greeting and places the trimmed nickname directly below the full name, above the headline; absent/blank nicknames omit the row. Floating data-derived statistics. “Dự án khác” keeps non-featured projects with three desktop/two tablet/one mobile columns.
- Reference 3: actual-category skill filters and compact logo grid; desktop skills/journey pair, stacked tablet/mobile and vertical timeline everywhere. Landscape CTA and dark identity/social footer; `showTemplateFooter={false}` for hosts with their own footer.
- Mobile refinement: three skills per row; category filters use 36px visual height, 11px text and smaller padding, with 4px hit slop. Desktop/tablet filters keep their original dimensions.
- `ProfilePortrait` defaults to framed ordinary photos, recognizes the existing sample cutout, accepts explicit `portraitMode="cutout"`, and falls back to initials on absent/failed media. No new DTO fields.
- Empty/hidden sections are omitted. `featured-projects` ordering is ignored for this template. No invented availability percentage or experience; no invented article reading time because the current contract has no such field.
- CTA uses a valid real email, otherwise an existing HTTP(S) social link (prefers LinkedIn). Example email and unsafe URL schemes do not become actions.
- Preview stays read-only with the existing sample notice. Backend appearance validation now accepts landscape blue/pink/mint; existing accepted modern pairs remain unchanged. No schema/dependency changes.

## Files
Created: nine files in `src/components/profile/templates/developer-landscape/`, three scenery assets in `assets/images/profile-landscape/`, `tests/landscape-data.test.cjs`, `tests/landscape-render.test.cjs`, `tests/landscape-browser-check.cjs`, spec and this handoff.
Modified FE: `src/data/profile-templates.ts`, `src/components/profile/ProfileTemplateRenderer.tsx`, SVG support in the existing `tests/profile-preview.test.cjs` loader, and `src/app/profile/preview.tsx` to hydrate a stable web shell before resolving query-selected templates/themes. The exported HTML previously rendered the default template, causing React #418 on query deep links; the browser test reproduced this before the fix.
Modified BE: `UniNet.Application/Services/PortfolioService.cs`, `UniNet.Tests/PortfolioProductionTests.cs`.

## Validation
- TypeScript: `npx tsc --noEmit`.
- Eight Node test files passed (run directly in-process; isolated test runner cannot spawn in this sandbox).
- Web static export: `npx expo export --platform web --output-dir dist/landscape-export`.
- Browser: blue/pink/mint × 320/360/375/390/412/430/768/1024/1280/1440; no page/content overflow or runtime console errors; nickname greeting, absence of hero chips/actions/links, category filters, vertical timeline, gallery routes, keyboard theme selection, reduced motion and landscape orientation. The 2026-10-04 refinement passes all eight Node test files, TypeScript, web export and this browser matrix. Verification uses the production static export on localhost:8093; `LANDSCAPE_BASE_URL` configures the browser runner's target. Chrome DevTools profile was busy; the existing Playwright runner verified the page instead.
- Backend: 14 `PortfolioProductionTests` passed, including all landscape pairs, invalid themes, persistence and content preservation.
- Screenshots: `dist/landscape-verification/hero|skills|footer-{blue|pink|mint}-{390|1440}.png`; inspected representative desktop/mobile output. Build/screenshots remain ignored artifacts.
- Latest nickname placement: focused render tests, TypeScript and web export pass; Chrome checks blue/pink/mint at 390/1440 verify nickname below name/above headline, no greeting, no overflow or runtime errors. Representative screenshots inspected.
- Native device runtime and largest native font scaling were not exercised; responsive verification ran in Chrome with React Native Web. No timed motion was introduced.

## Open locally
`http://localhost:8082/profile/preview?template=developer-landscape&theme=blue` (also `pink`, `mint`); gallery `/profile/templates`.
