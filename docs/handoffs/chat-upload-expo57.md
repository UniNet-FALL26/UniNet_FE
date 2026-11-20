# Chat attachment fixes

- Expo 57 installs `expo/fetch` globally on native. Its multipart encoder rejects RN's legacy `{ uri, name, type }` parts with `Unsupported FormDataPart implementation`. `api.ts` wraps that serialization failure as a network error, explaining why text-only messages succeeded.
- `messagingService.send` now appends `expo-file-system.File` objects on native, with an existence check before upload. Web keeps browser File/Blob uploads. Message IDs, fields, authentication and retry behavior remain unchanged.
- Web message bubbles use group semantics instead of rendering a button around attachment download buttons. Native button semantics and long-press actions remain.
- Regression checks: `node scripts/test-chat-upload.cjs` (5 checks, including the installed Expo multipart encoder) and `node scripts/test-chat-attachments.cjs` (21 checks).
- No live message was sent during verification. Chrome DevTools remains unavailable due to the existing profile conflict.
