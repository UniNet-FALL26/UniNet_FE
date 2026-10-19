# Shared image upload client

Generic picker/multipart helpers are in `src/utils/image-picker.ts` (`pickImage`, `imageBody`). Shared Cloudinary upload client is `src/services/image.service.ts`; independent of profile, templates, Gemini and portrait processing.

```ts
import { pickImage } from '@/utils/image-picker';
import { imageService } from '@/services/image.service';

const asset = await pickImage();
if (asset) {
  const { imageUrl, publicId, format } = await imageService.upload(asset);
  // Use imageUrl in this screen's draft, then persist through its normal save API.
}
```

`upload(asset, signal?)` calls authenticated `POST /api/images` with multipart `file`, returns `{ imageUrl, publicId, format }` and propagates API/cancellation errors. Supports web File/blob and native device URI, JPG/PNG/WebP <= 5 MB. Keys remain in the backend. Choosing/uploading does not save business data. Consumers manage cancellation and unused assets.

Existing `pickProfileImage` and `profileImageBody` exports delegate to the generic helpers. `uploadProfileImage` still uses the local `/api/profile/images` endpoint. Portrait processing uses `imageBody` but keeps `/api/ai-images/remove-background` -> preview -> `/api/ai-images/confirm` -> explicit profile save. Student avatar updates must continue to use that flow; ordinary images can use the shared upload client.

Verified: 7 new image-client tests, 5 existing profile-picker tests, 16 auth/refresh tests, and `npx tsc --noEmit`. Node's subprocess test runner is restricted in this environment, so run these directly: `node tests/image-service.test.cjs`, `node tests/profile-image-picker.test.cjs`, `node tests/refresh-token.test.cjs`. Web/native multipart behavior uses isolated fixtures; no live Cloudinary or native-device upload was performed. Backend contract/configuration: BE `docs/handoffs/shared-image-storage.md`.
