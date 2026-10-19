# Profile identity photos

- `StudentProfileStarter.tsx`: full cover with `contain`, decorative blurred `cover` layer; 44px camera buttons at bottom right; avatar clipping separated from button; student badge removed.
- `(tabs)/profile.tsx`: camera actions reuse `pickProfileImage`, `uploadProfileImage`, validated profile field update and existing editor save endpoint. No save on cancellation; duplicate operations blocked; focus/account cleanup aborts work. Save errors preserve displayed photos.
- Verification: TypeScript passed; 10 focused Node tests passed; Chrome scenario passed at 320/768/1440px, including both image uploads/persistence and failed upload without profile save. Screenshot reviewed at `dist/profile-verification/student-identity-photo-buttons.png`.
- Browser API was mocked; live backend upload and native device selection were not exercised. Existing web shadow/pointerEvents deprecation warnings remain outside this change.
- Scope: student starter identity card; populated portfolio template designs unchanged. No dependencies or backend contracts changed.
