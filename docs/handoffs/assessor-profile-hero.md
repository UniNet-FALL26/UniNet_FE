# Assessor profile hero — 2026-11-02

## Compact profile header

- Replaced the mobile/tablet eyebrow/title strip with right-aligned pencil and settings icons matching Student/Partner spacing and styling. Below 600px: 32x36px actions, 4px gap, 52px header; 600–1199px: 44x44px actions and 60px header. No outlined settings tile. Header stays outside scrolling content; >=1200px keeps the settings sidebar and no duplicate strip.
- Pencil opens the existing name-only dialog; gear opens /settings. Verified TypeScript and the hero browser suite at 320/390/600/768/1024/1440px, including fixed header on scroll, button geometry, edit modal and settings/back navigation. Screenshots: dist/assessor-profile-hero/header-*.png.

- `AssessorProfileHero` replaces the old role/nickname banner. Show cover, half-overlapping avatar, FullName and an inline tick only when the existing IsVerified flag is true. Three partner-style actions edit cover, avatar and profile. The professional details section remains separate.
- Uses the existing `pickProfileImage`, image validation/upload service and `CompanyPhotoDialog` preview/confirmation/retry flow. Upload is confirmation-only; a failed profile save retries the already uploaded URL.
- Before persisting a photo, fetch the latest owner profile and replace only the selected image URL. Preserve nickname in storage, common fields, the other image and all nine assessor fields. Ignore account switches/aborted requests; photo picking is guarded against duplicate actions.
- Hero profile edit action opens AssessorNameEditor with only FullName. Saving reads the latest owner profile and preserves every other field. Below the hero, five cards have their own pencil actions and section-specific popups (no name/nickname inputs). No nickname or role label is rendered in the hero; stored nickname remains unchanged.
- `assessorProfileService.save` accepts an optional AbortSignal. No backend changes or migration required beyond the existing assessor profile API.
- Verified TypeScript, existing nine-field CRUD browser check, and new `tests/assessor-profile-hero-browser-check.cjs`: full-name/tick semantics, action wiring, preview/cancel, multipart upload, failure/retry, persistence, retained data and 320/390/768/1440px layouts. Screenshots under ignored `dist/assessor-profile-hero`.
- Name-only regression verifies one input, empty-name rejection, cancel, failed save/retry, updated hero name and preserved professional/contact fields. Details regression uses the separate lower action and asserts no name/nickname inputs.
