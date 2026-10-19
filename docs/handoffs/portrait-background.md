# Student portrait processing

Implementation/config/API/schema/tests/limits: [BE handoff](../../../UniNet_BE/docs/handoffs/portrait-background.md).

FE files: `src/components/profile/ProfilePhotoForm.tsx`, `src/services/portrait.service.ts`, `src/utils/profile-image-picker.ts`, `src/app/profile/editor.tsx`, `src/app/(tabs)/profile.tsx`, shared `profile-media.ts`, Showcase/Landscape `ProfilePortrait.tsx`; browser/renderer tests updated. Student avatar goes through auto processing → private preview → confirm upload → dirty draft → explicit Save. Existing cover/entry uploads and company UX remain intact. Picker quality=1; original selected decoded RGB is preserved by BE worker. Templates share saved avatar URL and contain managed cutouts.

No Cloudinary keys exist yet. Add BE server secrets and apply PortraitAssets migration, start internal worker and restart BE before testing live confirmation. Never put Cloudinary secrets into Expo config.
