# Reusable frontend background removal

## Objective and success criteria
- Extract Gemini-backed background removal from the profile-specific service into `backgroundRemovalService`.
- Existing student portrait UI uses the reusable service; preview, explicit upload confirmation and session release remain unchanged.
- Keep `portraitService.process/confirm/release` and `PortraitPreview` compatible for existing consumers.
- Reuse authenticated `apiRequest` and web/native `imageBody`; keep Gemini keys and provider calls on the backend.

## Structure and style
Expo/React Native, strict TypeScript. Service in `src/services/background-removal.service.ts`, consumer in `src/components/profile/ProfilePhotoForm.tsx`, Node regression tests in `tests/`. Follow the existing object service pattern: `backgroundRemovalService.process(asset, signal?)`.

## Contract
- `process(asset, signal?)`: multipart POST `/ai-images/remove-background`, returns PNG preview and session metadata.
- `confirm(sessionId, signal?)`: POST `/ai-images/confirm`, returns persisted Cloudinary URL.
- `release(sessionId, signal?)`: DELETE `/ai-images/sessions/{encodedId}`.
- Validate response envelopes and required result values; propagate server and cancellation errors.
- Current backend supports active Student accounts and main-person portraits only. Reusable frontend service does not widen those permissions or imply arbitrary-object segmentation.

## Ordered tasks and verification
1. Add failing contract tests for the reusable entry point, malformed results, cancellation and cleanup. Verify with `node --test tests/background-removal-service.test.cjs`.
2. Extract service, retain compatible portrait adapter, and update the current UI consumer. Verify focused service and existing image tests, then `npx tsc --noEmit`.
3. Review the focused diff and document reuse and live-test limits in `docs/handoffs/background-removal-service.md`. Run `node --test tests/*.test.cjs`.

## Boundaries
Always preserve unrelated existing workspace changes and existing profile-save behavior. No new dependency, backend contract change, API key in FE, automatic profile save, live AI image submission, commit, push or deployment.

## Review status
Scope and plan approved by the user before implementation.
