# Partner profile hero

## Latest reference adjustment
Verified partners show a blue verification tick directly beside the organization name, replacing the old green “Đã xác minh” pill; unverified profiles have no tick and retain their unverified label. On phone viewports (<700px), move the profile edit action from the hero to a pencil icon beside Settings in the page header. Keep this header outside the scrolling profile body so its screen position stays fixed during scrolling, matching Student behavior. Reuse the existing edit dialog, loading/save guards and desktop/tablet actions.
On phone viewports (<700px), both Student and Partner profile content reaches the screen edges and outer profile/info panels have square corners; retain readable inner text padding and desktop/tablet layout. Partner avatar becomes 96px with a -48px cover overlap, matching the Student avatar's half-height lift. Preserve round avatar clipping, camera actions and cover/edit behavior.
Phone cover actions on both profiles use compact 28px pills with tighter icon/text/padding and extra tap slop. The Partner profile edit action uses a compact blue pill, aligned right when contacts stack, rather than spanning the card width.
Match the Student starter's centered content width and side spacing: on desktop keep the main/Settings columns, constrain the inner partner content to 1000px and apply 24px horizontal padding. Apply to the entire profile content, not only the cover. Keep narrow/mobile spacing and existing column behavior.

Use a circular avatar at both sizes (104px desktop frame, 80px compact frame). Preserve overlap, image positioning, white border and the separate camera button. Verify with the existing hero browser suite, TypeScript and desktop/mobile screenshots.

## Scope and acceptance
- Cover rendering update: use a 240px cover in wide profile cards and 200px in compact cards. Display the entire account/default image with `contain`, centered over a blurred `cover` copy of the same source to fill unused space. Legacy cover crop metadata does not crop the foreground; avatar crop behavior stays unchanged.
- At web widths >=1200px, show the existing `SettingsPanel embedded` in a 400px right sidebar, matching the student profile. Below that breakpoint, show a top-right gear button linking to `/settings`. Settings account details and partner verification actions must remain functional.
- Match the supplied profile reference: shallow cover, circular avatar overlapping its lower edge, organization name with verification badge and industry pill, horizontal contact details and a labeled blue edit button on desktop.
- Use the account's existing cover when present. Otherwise display a bundled blue glass-office banner with the current organization name; never save the default as the user's cover.
- Preserve avatar/cover previews, photo positioning/upload and the existing profile edit form. At narrow widths, wrap contact details and place the edit button below the identity block.

## Plan and verification
1. Add a browser regression for cover fallback versus account cover, avatar overlap, desktop contact alignment, narrow layout and existing edit actions. Prove failure first.
2. Extract only the hero presentation to `src/components/company/CompanyProfileHero.tsx` and reuse existing profile data, image framing and callbacks.
3. Run `node tests/partner-profile-hero-browser-check.cjs`, `npx tsc --noEmit`, and `git diff --check`; inspect desktop/mobile screenshots.
4. Settings layout: extend the browser check for sidebar visibility, top settings button and account dialog; verify 1199/1200px boundary. Base hero layout on its measured width so adding the sidebar does not crowd the main column.

## Conventions and boundaries
Use existing React Native styles, `CompanyIcon`, and `ProfileFramedImage`. Generated default artwork lives in `assets/images/partner-default-cover.png`. No schema, API or dependency changes. Preserve all profile fields and unrelated sections.
