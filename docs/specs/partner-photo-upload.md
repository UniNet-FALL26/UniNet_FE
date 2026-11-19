# Partner photo upload

## Behavior and acceptance
- A camera action sits at the avatar's bottom-right corner. This action and Edit cover open the device image picker, including when the account already has an image.
- Selecting a JPG/PNG/WebP <=5MB opens a local preview dialog. No upload or profile write occurs until Confirm. Cancel preserves the current photo.
- Confirm calls existing authenticated POST `/images` (Cloudinary), then PUT `/profile/partner` with the new URL and existing organization fields. The response is the existing AccountResponse contract. Update the visible profile and header avatar immediately after persistence, without waiting for additional profile/dashboard GETs.
- Disable repeated submission/closing during persistence. Keep the preview and display an error if upload or DB save fails. Retry after DB failure reuses the uploaded URL. Abort in-flight work on unmount.

## Implementation plan
1. Browser regression: picker -> local preview, cancellation/no early upload, confirmed upload/save ordering, existing field preservation, immediate image/header update, upload/DB failure and retry, reload persistence. Confirm the initial regression fails.
2. Add a partner-specific preview dialog using the existing image picker, validator, uploader and Button. Keep student photo/background-removal workflows unchanged.
3. Expose the existing partner PUT as `companyService.saveProfile` returning AuthAccount; retain the current refresh behavior of `updateProfile` for other callers. Reuse saveProfile for photos and synchronize the auth account/header avatar.
4. Wire avatar camera and all photo-edit actions to the picker, preserve image viewing. Run the new test, existing partner profile/community checks, `npx tsc --noEmit` and diff review. Inspect preview and saved layouts.

## Commands and boundaries
- Tests: `node tests/partner-photo-upload-browser-check.cjs`, `node tests/partner-profile-hero-browser-check.cjs`, `node tests/partner-community-browser-check.cjs` against Expo web at `http://localhost:8081`.
- No new dependencies, authentication flow, upload handler, Cloudinary credentials or backend changes. Use existing API validation and never persist local preview URLs. No crop/AI processing is required for the new preview/confirm flow.
