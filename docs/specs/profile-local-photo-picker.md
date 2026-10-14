# Profile editor pencils and local photos

User requests pencils immediately beside introduction text, one portrait camera in templates 1 (Modern) and 3 (Landscape), and selecting images from the device instead of typing URLs.

1. Make hero field wrappers size to their text while retaining native typography/wrapping and small pencil spacing. Remove Modern/Landscape cover camera controls; preserve artwork and portrait controls.
2. Add authenticated `POST /api/profile/images` multipart `file`, maximum 5 MiB, JPEG/PNG/WebP signatures only. Store under ignored API `App_Data/profile-images` with random generated names; return `{ url }`. Public GET serves these image URLs with fixed MIME and nosniff, without exposing paths. No database migration or external provider.
3. Use Expo image picker on web/native. Camera opens the device picker directly. Upload a selected image, show it in a confirmation dialog, and update the draft on confirmation; cancel preserves existing draft. Existing Save persists only the returned HTTP URL. Show permission/upload errors and retain retry/remove actions.
4. Verify upload rejection/limits/storage, multipart API handling, pencil proximity, camera counts, local selection/preview/save/reload with mocked browser APIs, TypeScript and focused existing tests. Update handoff.

Commands: `npx tsc --noEmit`, `node --test tests/*.test.cjs`, `dotnet test UniNet.Tests`, mocked Chrome checks with `PROFILE_TEST_ORIGIN`.

No commit or push. Preserve previous hero fixes and unrelated skill catalog changes. Uploaded files need a persistent API disk in deployments. The existing save endpoint remains unchanged.
