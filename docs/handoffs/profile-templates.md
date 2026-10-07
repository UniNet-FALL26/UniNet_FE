# Profile templates

## Delivered
- Preview header shows `Chọn mẫu này` to the right of the template name, opening the personal editor with selected template/theme. Gallery/detail are sample-only. See `profile-template-editor.md` for current editing and data-saving behavior.
- Removed the template's top navigation/brand/contact bar; preview begins with the introduction hero. Gallery uses the same updated renderer.
- Density adjustment: typography, section spacing, hero/avatar, project covers, statistics and article thumbnails reduced approximately 10–15%; buttons retain at least 44px touch height.
- `/profile/templates`: two-column gallery on mobile; actual 1000px template canvas scaled and cropped at card bottom, color controls and name below, no category.
- `/profile/preview?template=developer-modern&theme=blue|amber`: read-only responsive preview; colors selectable without saving, direct links and back navigation supported.
- `DeveloperModernTemplate.tsx` composes hero, projects, statistics, skills, journey, certificates, activities, languages, articles and footer. Full name + nickname in profile; app nickname helper preserved. No decorative semicircles.
- `src/data/profile-templates.ts`: template metadata and named semantic color tokens; blue/navy and warm yellow-orange. Future templates need their own renderer and registry entry; no admin UI yet.
- Bundled generated transparent portrait and code-authored SVG cover/project illustrations in `assets/images/profile-samples`; sample preview works without fetching images from external hosts.

## DB / API contract
`src/data/profile-sample.json` follows `PortfolioResponse` in BE `DTOs/Auth/PortfolioContracts.cs`, checked by TypeScript.
- `profile.*` maps to `UserProfile` public presentation fields, including `fullName`, `nickname`, `avatarUrl`, `coverUrl`.
- Portfolio headline/objective -> `CareerProfile.Headline/CareerObjective`.
- Education/experience/projects/skills/certificates/activities/languages/socialLinks -> corresponding CareerProfile JSON columns.
- Location/availability/contactEmail/cvUrl/articles -> `BasicInfoJson` via PortfolioService.Basic.
- Appearance -> `AppearanceJson`; the renderer respects section order/hidden sections.
- URLs under `https://example.com/uninet-samples/` are sample-only aliases resolved to bundled assets by `profile-media.ts`, never fetched. Example article links are noninteractive. No fixture is submitted or saved.

## Preview data rules
Gallery/detail always use the full fixture, independent of authentication. No user data requests or supplementation. The personal editor alone fetches GET `/profile/portfolio/me`, uses real fields and leaves empty sections empty. API errors allow retry; outstanding requests abort on account change/unmount and loaded data is scoped to account ID.

## Verification
- `node tests/profile-preview.test.cjs`: empty/partial/complete data, immutability, selected theme and invalid identifiers.
- `node tests/display-name.test.cjs`: existing app nickname behavior.
- `npx tsc --noEmit`; `npx expo export --platform web --output-dir dist/profile-export`.
- Browser fallback: installed Playwright + headless Chrome; gallery, both colors, names, navigation, direct/invalid links, keyboard selection and no horizontal overflow at 320/375/768/1440. No page/console errors. Screenshots in ignored `dist/profile-verification`.
- Chrome DevTools MCP unavailable due to an occupied browser profile. Native Android/iOS device rendering not exercised.
- `tests/profile-browser-check.cjs` currently points to the installed Windows Playwright runtime and Chrome; adapt these paths on other machines.

## Scope
FE only. Backend already exposes identity and portfolio contracts. Personal data editing/saving is delivered in `profile-template-editor.md`; saving appearance and admin management remain separate work. Existing user edits were preserved; no dependencies added.
