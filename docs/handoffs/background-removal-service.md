# Reusable background removal service

## Integration
- `src/services/background-removal.service.ts` exports `backgroundRemovalService` and `BackgroundRemovalPreview`.
- `ProfilePhotoForm` uses it directly. `portrait.service.ts` re-exports the same implementation/types under the existing names for compatibility.
- Shared `apiRequest` handles authentication/refresh/errors. Shared `imageBody` handles web and Expo native multipart files and existing 5 MB/type validation.
- Gemini credentials and provider calls remain on BE. Current `/ai-images` endpoints require an active Student account and segment the main portrait person; this extraction does not expand backend capabilities.

## Reuse
```ts
import { backgroundRemovalService } from '@/services/background-removal.service';

const controller = new AbortController();
const preview = await backgroundRemovalService.process(asset, controller.signal);
// Show preview.previewUrl. Keep preview.sessionId for the user's next action.
// On explicit acceptance:
const imageUrl = await backgroundRemovalService.confirm(preview.sessionId, controller.signal);
// Store imageUrl in the local draft; persist the profile only on explicit save.
// If discarded instead of accepted:
await backgroundRemovalService.release(preview.sessionId);
```

All three methods accept an optional `AbortSignal`. Abort processing when a screen closes or its image changes. If a late response returns a session after cancellation, release that session. Use a fresh/unaborted signal or omit it for cleanup. Callers must catch errors and offer retry; the service does not automatically repeat paid processing requests. Backend preview sessions expire after 30 minutes; retry processing if confirmation reports expiration.

## Verification
- Added five contract tests: preview/confirm/release, optional signals/compatibility, malformed previews, malformed uploads, API errors/cancellation. They failed before implementation because the new service did not exist, then passed.
- All 21 `tests/*.test.cjs` files passed, run individually with `node <file>` because the sandbox blocks the default test runner's child-process spawn.
- `npx tsc --noEmit` passed.
- Existing `node tests/profile-editor-browser-check.cjs` passed against a local Expo web server with mocked API, including portrait preview/confirmation and responsive editor regressions at 320/768/1440px. Chrome required execution outside the sandbox due to `spawn EPERM`.
- Focused diff reviewed for compatibility, response validation, cancellation, auth and API-key isolation. No dependency or backend change.
- Live Gemini quality/provider availability and native device behavior were not re-tested. Existing BE handoffs describe provider configuration and deployment requirements.
