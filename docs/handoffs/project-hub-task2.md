# Project Hub — TASK 2

Updated: 2026-11-16. Local implementation; no remote deployment.

- Entry: Profile → Projects, canonical `/profile/projects`. Old standalone project/recruitment/workspace entries removed; compatibility routes redirect. `/group/:id` mounts the rebuilt detail screen.
- Components: `src/components/projects/hub/` includes the project list, create/live-preview dialog, detail/edit screens, recruitment, invitation/member management, personal review and request inbox.
- Contract/service: `src/types/project-hub.ts`, `src/services/project-hub.service.ts`. Requires the new backend `/api/project-hub` endpoints.
- Uploads use the existing image/file API and DocumentPicker. Logos: PNG/JPG, ≤5 MB. Documents/media: ≤20 MB. Empty states use neutral placeholders; no seeded/mock projects or reference image uploads.
- Technologies accept catalog suggestions and custom names. External projects default private and do not assume the creator is Leader. Community creation is an explicit Internal-project recruitment action.
- Kept historical status meanings; Pending remains Chờ duyệt and Rejected remains Bị từ chối. Chat is unavailable because project chat storage is absent.

## Verification

8 routing/service tests passed; 22 existing external-project utility checks passed. TypeScript has pre-existing failures in `src/app/(tabs)/opportunities.tsx` and `src/components/assessor/AssessorProfilePosts.tsx`; new Project Hub files have no reported errors.

Browser verification covered real API creation, edit/save/reload, recruitment publishing, community/member display, desktop/mobile layouts, modal Escape and focus return. Temporary QA projects/account were removed afterward.

Local verification used `http://localhost:8082/profile/projects`, with `EXPO_PUBLIC_API_URL=http://127.0.0.1:5245/api`. Temporary API/Expo verification servers were stopped after QA. Existing `.env` still targets Render; deploy the matching backend before using that API. Existing port 8081 server was preserved.

Detailed backend/schema/testing handoff: `UniNet_BE/docs/handoffs/project-hub-task2.md` in the shared workspace.
