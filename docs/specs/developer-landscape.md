# Developer Landscape

## Objective / acceptance
Add `developer-landscape` as the third profile template, sharing `PortfolioResponse` (the existing profile view model) and the current gallery/preview. One component supports blue / pink / mint, default blue. Preserve existing templates and their defaults.

Reference 1/2: cinematic landscape hero, left identity, center portrait, right quote/code, overlapping statistics, three project columns. Reference 3: filterable brand-logo skill tiles, vertical journey, landscape contact strip and dark footer. Mobile reorders identity → portrait → details, stacks sections, uses two metric/skill columns. Hide empty/hidden sections; no invented user statistics, articles, or contacts. Support cutout, ordinary and missing/broken avatar; footer can be disabled by its host.

## Stack / structure / style
Expo 57, React 19, React Native 0.86 and web. Add components under `src/components/profile/templates/developer-landscape`, bundled SVG scenery under `assets/images/profile-landscape`, tests under `tests`, handoff under `docs/handoffs`. Reuse existing primitives, media resolver, logo resolver, preview dataset and DTOs. Native StyleSheet follows existing conventions, e.g. `<Text style={{ color: theme.accentStrong }}>…</Text>`; theme colors live only in theme configuration.

## Commands / testing
`node --test tests/*.test.cjs`; `npx tsc --noEmit`; `npx expo export --platform web`; `node tests/landscape-browser-check.cjs`; `npx expo start --web --port 8082`. Backend: `dotnet test UniNet.Tests/UniNet.Tests.csproj --filter FullyQualifiedName~PortfolioProductionTests`.
Check registry defaults, empty/hidden data, data immutability, portrait modes, actual filters/keyboard, AA text contrast, section navigation, gallery routing and three themes at 360/375/390/412/430/768/1024/1280/1440. Capture representative screenshots and inspect them.

## Boundaries
Always: additive scoped changes, verify data and responsive behavior. Ask first: new dependencies or schema migrations. Never: modify old template components, add mock production data, duplicate gallery/navigation, recolor brand logos, video/WebGL, semicircle shapes. User explicitly authorizes full implementation without intermediate approval gates. Existing uncommitted work remains in place.

## Ordered tasks
1. Theme/registry and data helpers: add metadata and pair validation; verify focused unit tests.
2. Hero/portrait/stats: safe three-column and stacked compositions with scenery; verify render tests/typecheck.
3. Projects, filtered skills, vertical journey, certificates/articles and CTA/footer: obey visibility and responsive widths; verify data/contrast tests.
4. Integrate renderer/gallery, run browser matrix/build, inspect screenshots, document handoff.

No open requirement questions. Backend currently rejects every template except modern; extend validation only for the new landscape pairs, preserving existing accepted pairs.

## Hero refinement (2026-10-04)
Remove the hero skill chips, contact/project buttons and social links shown in the user's screenshot. Keep the biography. Latest refinement removes the entire greeting and displays the trimmed nickname directly below the full name, above the headline; omit the nickname row when absent/blank.

Ordered tasks: update focused render assertions first; simplify `LandscapeHero` and verify render tests/typecheck; update browser assertions and verify desktop/mobile across all three themes. Reuse existing data and styles without new dependencies or API changes.

## Personal projects refinement
Rename the displayed project heading to `Dự án bản thân`; retain the existing `other-projects` section key and non-featured project selection. Remove project type badges over covers. Latest refinement uses four columns when section width is at least 900px, two from 600px, otherwise one. Show a plain text `Công nghệ sử dụng: …` line below each description from existing technologies; omit it for an empty list. Keep covers, titles, descriptions and links. Update focused render/browser assertions, implement the scoped change, then verify typecheck, web export and responsive browser rendering.
