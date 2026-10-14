# Profile pencils and device image selection

- Hero text pencils now measure the last rendered line, sit 4px after it, and remain clickable. Web uses text ranges on layout; native uses Text line/layout events. Typography and wrapping stay unchanged.
- Templates are ordered Modern, Showcase, Landscape. Removed cover cameras from Modern/Landscape; each hero keeps its portrait camera.
- Cameras open Expo image picker directly from the gesture. Selected files upload as multipart to `POST /api/profile/images`; the photo dialog previews the local image, confirms the returned HTTP URL into the draft, and supports retry/change/remove/cancel. Explicit profile save still persists the draft.
- `apiRequest` lets FormData generate its own content-type boundary, including retries after token refresh. Existing JSON behavior is preserved.
- Expo plugin requests photo access with a Vietnamese explanation, without camera/microphone permissions. Native builds need the installed module included; physical device verification remains outstanding.

Verification: TypeScript and 66 Node tests pass; 63 BE tests pass. Chrome checks at 320/768/1440px validate text geometry, 4px pencil proximity, direct pencil clicks, one portrait camera, device file selection, upload retry, cancel/remove behavior, save/reopen and existing editor flows. Isolated HTTP API checks validate authentication, multipart binding, image retrieval, nosniff/MIME, type and size rejection. Real user data was not used or modified.

Restart BE to expose the new upload endpoint. Uploads live on API disk under `App_Data/profile-images` (ignored by Git); deployments need a persistent volume. Selected/uploaded photos cancelled before save can leave unreferenced files; lifecycle cleanup is not included. No commits/pushes; previous skill catalog work remains untouched.
