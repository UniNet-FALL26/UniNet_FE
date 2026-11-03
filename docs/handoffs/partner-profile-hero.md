# Partner profile hero

- Verified partners now have a blue verification tick immediately beside the organization name, replacing the old green “Đã xác minh” pill per the latest user request. The tick is conditional on the existing `isVerified` value and updates with profile verification state. Unverified profiles retain their unverified label.
- Phone profile header (<700px) is outside `PageScroll`, with a pencil action beside Settings. It stays fixed while the profile body scrolls. The pencil reuses the existing organization edit dialog and loading/save guards; the duplicate hero edit button is hidden only on phones. Existing tablet/desktop hero actions remain.
- Compact header (<600px) now matches Student sizing exactly: actions are 32x36px, with 8px top/bottom padding and a 4px gap. Verified header height is 52px; fixed scrolling behavior is retained.
- `tests/partner-profile-mobile-header-browser-check.cjs` proves the previously missing header, then verifies unverified/verified tick states, long names, 320/390/600px layouts, actual wheel scrolling with unchanged header y-position, working edit dialog without navigation and desktop fallback. Screenshots: ignored `dist/partner-profile-mobile-header/{top,scrolled}-*.png`. Existing hero regression now finds the edit action at page level, supporting its new header position.
- Latest focused browser check passes, including absence of the old green label. TypeScript and whitespace checks pass; visually inspected the verified phone header/profile before and after scrolling. Account-info/dialog regressions now assert the inline tick when checking approved hero state.

- Phone edge-to-edge update (<700px): profile scroll padding is zero; hero, About and opportunities panels have square corners and no side borders. Inner text padding remains. Phone avatar is now 96px with a 48px overlap and 4px circular white frame, matching the Student starter. Tablet/desktop spacing and avatar sizing remain unchanged.
- Checked browser geometry: Partner hero spans x=0..320/390 with 0px corner radius; avatar is 96px and overlaps the cover by exactly 48px. At 768/1440px, previous inset/16px corners remain. Student profile likewise spans x=0..320/390 with square corners. TypeScript, 5 identity-photo tests and whitespace checks pass; screenshots are ignored under `dist/partner-profile-hero/edge-to-edge-*.png` and `dist/profile-verification/compact-cover-*.png`.

- Phone controls (<700px): cover edit pill is 28px high with 12px camera glyph, 9px text and tighter padding, matching the Student cover action. Extra hit slop preserves its tap area. The Partner profile edit action is now a compact blue pill: 36px high on wide cards, 34px and right-aligned on stacked cards, replacing the full-width bar.
- Phone-control follow-up: TypeScript, 5 identity-photo tests and static export pass. Inspected current 390px Partner screenshot. A temporary browser inspection confirms Student cover height 28px at 320/390px and 32px at 1440px, retaining the translucent background. The broad hero regression encountered a dev-server reload timeout; its retry was stopped while resetting the preview server. No business behavior changed.

- Latest cover action adjustment: both Partner and Student cover edit buttons sit at bottom-right (12px inset) with a 65%-opaque white background, keeping text/icons fully opaque.

- Latest reference alignment: desktop profile content now uses the same centered 1000px maximum width and 24px horizontal padding as the Student starter, inside the existing main column. All profile cards share the inset; the Settings sidebar and mobile spacing retain their layout.
- Avatar frames are circular at both sizes: radius 52px for 104px and 40px for 80px. White border, cover overlap, image crop/position and the separate camera button remain functional.
- Latest checks pass: existing hero browser regression at 320–1920px (including editing and preview), TypeScript, static web export to `dist/partner-profile-web` and whitespace checks. Visually inspected 390px/1920px screenshots.

- `CompanyProfileHero.tsx` replaces only the original top card in `(company)/profile.tsx`. Cover height is 240px in cards >=900px wide, 200px in narrower cards. Both account and default covers render the full source with `contain`, over a scaled/blurred `cover` copy of the same image to fill gaps. Cover crop metadata is ignored for this display; stored URLs and avatar cropping remain unchanged.
- At measured card widths >=900px: 96px avatar, name/verification/industry, horizontal contacts and blue labeled edit action. Narrower cards use a 76px avatar (88px on phones), stacked contacts and compact right-aligned edit action. Each avatar is centered on the bottom cover edge with half its height above and half below. The redundant page title/subtitle is removed; the top mobile settings button remains.
- Existing account `coverUrl` supplies the full cover image source; missing cover uses `assets/images/partner-default-cover.png` and dynamic organization text. No default URL is persisted to the account. Regression checks also cover wide/portrait images and legacy crop URLs at 390/1440px.
- Viewing existing photos and editing organization fields remain available. Photo edits now open the picker and `CompanyPhotoDialog` for local preview followed by confirmed upload/save. The avatar has a separate camera action. See `partner-photo-upload.md` for persistence, error handling and tests.
- Verification: `node tests/partner-profile-hero-browser-check.cjs` covers both cover branches, avatar overlap, 320/390/768/1024/1440px layouts, contact alignment, edit form and cover preview. `npx tsc --noEmit` passes.

## Responsive settings
- Web width >=1200px: profile scrolls in the main column; existing `SettingsPanel embedded` occupies a 400px right sidebar with its own scroll. This matches the student profile breakpoint and component.
- Smaller widths: a top-right gear labeled `Mở cài đặt` navigates to the existing `/settings` screen. Desktop uses the settings panel's logout action; the old profile logout remains on smaller screens.
- Regression also covers 1199/1200/1920px, right-side settings position, account dialog and mobile settings navigation/back. No changes to shared settings behavior or APIs.

## Verification reminder
- Replaced the old verification card below the profile with the same `VerificationBanner` used by the student profile, in the top row beside mobile settings. It says `Xác minh tài khoản đối tác` and opens `/(company)/verification`.
- Unverified, rejected and cancelled profiles get a verification action; pending profiles show a status action without asking for resubmission. Approved/verified profiles hide the reminder. Dismissal lasts for the current profile screen session. Compact layout uses the measured main-column width (<600px).
- Shared banner gained optional copy/action props; student defaults and behavior stay intact. Partner regression covers unverified/pending/rejected/verified states, dismissal and destination; the existing student banner browser check also passes.

## Organization edit dialog
- Centered card capped at 600px with distinct header/body/footer, close action, blue focus styling and accessible input labels. Email/phone share a row at viewport widths >=600px and stack below it. Keyboard avoidance and scroll keep fields accessible on mobile; save/cancel buttons and fields are disabled during save.
- Existing organization/about data, validation, API persistence and transient feedback remain in the same profile screen. Browser checks verify compact width/centering and field arrangement at 320/390/768/1440px.

## About section
- Social/website links now have transparent backgrounds and no borders, including on hover, per the latest user reference. Icons, labels, wrapping, touch targets and link actions are preserved.
- `CompanyAboutCard.tsx` renders the organization introduction with a labeled icon/title, readable description, edit action, and separated website/social links. Compact link buttons show only the brand icon and platform label, without a URL, arrow or connection heading; existing validated link-opening and about-edit callbacks are reused.
- `websitePlatformLabel` shares the host detection already used by `WebsiteBrandIcon`. Links wrap on mobile without overflowing. Browser checks cover Facebook/website rendering and opening the about edit form; screenshots are `dist/partner-profile-hero/about-{390,1440}.png`.

## Default artwork

Mode: built-in imagegen. Workspace asset: `assets/images/partner-default-cover.png`.

Final prompt:

> Use case: ads-marketing. Asset type: default cover banner image for UniNet partner organization profiles. Create a polished wide horizontal corporate technology cover, approximately 4:1 panorama. A photorealistic modern glass office building on the right half with reflective blue facade and clean diagonal perspective, bright blue sky and a few soft white clouds, small green trees along the lower right edge. The left half transitions to a deep royal blue field with very subtle thin swooping cyan lines, leaving calm open space for optional dynamic organization text added later in code. Match a premium Vietnamese technology company profile banner, crisp and bright, predominantly azure and royal blue. Keep important architecture in the middle vertical band so the image crops well as a shallow header. NO TEXT, no words, no typography, no logos, no UI, no people, no watermarks.
