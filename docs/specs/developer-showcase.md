# Developer Showcase

## Scope and acceptance
Second independent profile template (`developer-showcase`) based on supplied mint/orange references. One renderer and two token sets (`mint`, `orange`). Reuse PortfolioResponse, profile-sample.json, preview resolver, bundled media/skill logos, existing gallery and preview routes. No data duplication, backend writes, dependency changes, template navigation, sidebar, semicircle decoration or reference footer.

Hero: dark technical background, strong name/headline, safe portrait (known transparent asset, framed ordinary avatar, initials on missing/broken image), skills, real section/contact actions, code window and data-derived statistics. No greeting, principles strip or separate featured-project section (user revision). Grouped skills, horizontal desktop/vertical mobile journey, a single “Dự án của tôi” section using all existing projects with four compact cards per desktop row, compact certificates, optional articles and dark contact CTA. Project type overlays removed; technology chips retained. Hide empty and hidden sections; preserve section ordering where supported. Theme covers every accent while leaving source imagery/logos unchanged.

## Stack and boundaries
Expo Router / React Native StyleSheet / expo-image / existing symbols. Shared template dispatcher; no second view model or preview system. Read-only previews, sample contact links remain noninteractive, user URLs validated. Preserve existing working tree changes and Developer Modern. User supplied implementation order and explicit instruction to proceed authorize the following plan.

## Ordered slices
1. Register theme metadata and test defaults, deep links, isolation and contrast. Files: theme module, registry, focused tests. Verify Node tests.
2. Build responsive hero/portrait and shared template dispatch. Verify TypeScript.
3. Implement compact content sections and CTA; wire gallery and preview. Verify unit tests, typecheck and web export.
4. Browser verify both themes at 360/375/390/412/430/768/1024/1280/1440 plus 320 and landscape. Check overflow, image/text overlap, valid actions, keyboard selection, empty sections, avatar fallback, unchanged first template. Save screenshots; review and handoff.

## Risks
Unknown user image transparency: only known transparent bundled portrait uses cutout mode; ordinary images use bounded frame. Missing article data: omit section. Missing external URLs: omit action. Dense desktop layout: reflow at 1024 and 768 rather than shrinking mobile typography. No continuous animation; reduced-motion safe by construction.
