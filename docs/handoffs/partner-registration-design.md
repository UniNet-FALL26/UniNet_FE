# Partner registration design

- Added `PartnerAuthScreen` around the existing partner selection and account forms. Desktop fills the viewport without outer margins or a height cap: illustrated brand/benefits sidebar on the left, centered form on the right. Mobile puts readable introductory copy above an illustration strip and the form; choices stack below 380px.
- `assets/images/partner-campus.png` is a built-in ImageGen illustration derived from the supplied reference style: two business partners, university campus and sky, without baked UI text. `partner-sidebar-veil.svg` keeps sidebar copy readable and blends the illustration.
- Selection preserves partner IDs 0–4 and passes both label and numeric ID to the account form. Selected cards have tinted fill, blue border/check and `aria-checked` for current React Native Web. Shared `AuthScreen.centered` and `fixed`, plus `Input.compact`, are optional; other auth screens retain their layout.
- Progress describes the existing actual two-step flow: partner type → account information. Account creation still calls the existing partner API once and enters the company area. No fictitious business-information stage, API change, real account creation or dependency change.
- TypeScript, `partner-registration-browser-check.cjs` and the existing desktop auth transition regression pass. Partner checks cover 320/390/768/1024/1440/1920px, decoded artwork, no horizontal overflow, all five type IDs/labels, required-field rejection and successful mocked submission. Desktop/mobile screenshots were inspected under ignored `dist/partner-registration-verification/`.
- Physical native-device rendering and real production partner registration were not tested.

- Desktop web at least 900px wide and 740px high disables both partner scroll containers. Compact inputs, card spacing and header keep actions visible at 768px height. Short windows retain scrolling for access. Artwork covers the entire left panel with bottom alignment to lift the characters and reveal the handshake. Mobile retains its scrolling layout. Browser checks assert viewport bounds and unchanged form position after mouse-wheel input.

- Partner forms set `AuthScreen.showBrand=false`; branding appears once in the left introduction. The optional prop defaults to true for other authentication pages.

- Typography revision: desktop title uses three balanced lines; benefits become three columns from 1300px and remain stacked on narrower desktop widths. Mobile uses an edge-to-edge introduction, a 220px maximum image strip with both faces visible, and naturally sized embedded forms with one outer scroll container. `AuthScreen.embedded` is opt-in; existing auth screens keep their scrolling behavior.

- Entrance motion: focus-triggered 440ms ease-out fade for introduction/copy, then form at a 100ms offset. Form slides 24px horizontally on desktop, 18px vertically on mobile. Native Animated driver on native platforms; no new dependencies. Respects reduced-motion preferences, removes listeners and stops animations on blur. Browser checks sample real intermediate opacity and verify reduced-motion skips interpolation.

- Mobile hero now uses a single full-bleed campus image behind the introduction instead of a separate cropped image strip. `partner-mobile-veil.svg` gently fades the sky behind copy and blends the lower image edge into the white form. Responsive minimum height preserves both faces and handshake. Entrance motion is unchanged.

- Removed the visible type/account progress indicator from the account form at user request. Selection and account navigation remain unchanged.
