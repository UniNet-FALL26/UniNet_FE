# Project Hub — TASK 2

Updated: 2026-11-16. Local implementation; no remote deployment.

- Entry: Profile → Projects, canonical `/profile/projects`. Old standalone project/recruitment/workspace entries removed; compatibility routes redirect. `/group/:id` mounts the rebuilt detail screen.
- Components: `src/components/projects/hub/` includes the project list, create/live-preview dialog, detail/edit screens, recruitment, invitation/member management, personal review.
- Contract/service: `src/types/project-hub.ts`, `src/services/project-hub.service.ts`. Requires the new backend `/api/project-hub` endpoints.
- Uploads use the existing image/file API and DocumentPicker. Logos: PNG/JPG, ≤5 MB. Documents/media: ≤20 MB. Empty states use neutral placeholders; no seeded/mock projects or reference image uploads.
- Technologies accept catalog suggestions and custom names. External projects default private and do not assume the creator is Leader. Community creation is an explicit Internal-project recruitment action.
- Kept historical status meanings; Pending remains Chờ duyệt and Rejected remains Bị từ chối. Chat is unavailable because project chat storage is absent.

## Verification

8 routing/service tests passed; 22 existing external-project utility checks passed. TypeScript has pre-existing failures in `src/app/(tabs)/opportunities.tsx` and `src/components/assessor/AssessorProfilePosts.tsx`; new Project Hub files have no reported errors.

Browser verification covered real API creation, edit/save/reload, recruitment publishing, community/member display, desktop/mobile layouts, modal Escape and focus return. Temporary QA projects/account were removed afterward.

Local verification used `http://localhost:8082/profile/projects`, with `EXPO_PUBLIC_API_URL=http://127.0.0.1:5245/api`. Temporary API/Expo verification servers were stopped after QA. Existing `.env` still targets Render; deploy the matching backend before using that API. Existing port 8081 server was preserved.

Detailed backend/schema/testing handoff: `UniNet_BE/docs/handoffs/project-hub-task2.md` in the shared workspace.

## Project card/profile layout update

- `ProjectCard.tsx` provides the shared cover/title/description/technology layout for project management and all three portfolio templates. Cards omit project status badges.
- `ProjectListCard.tsx` supplies actual active-member counts, creation/update dates; tapping a card opens its detail screen. The card overflow menu was removed per user request. Portfolio cards preserve image editing, role, date, contribution and links without fabricating member counts or creation dates.
- Profile → Projects retains the same desktop settings sidebar as Profile and Posts. The search and request-inbox header actions and their associated UI have been removed; only Add project remains in the header.
- `project-cards-profile-browser-check.cjs` passed using intercepted fixture API responses: hidden statuses, sidebar placement, absence of overflow/search/inbox header actions, widths 320/768/1024/1440, and all three profile templates. No database writes. Temporary visual QA route removed.

Removed overflow buttons from both project cards and the detail header. Completion/delete/leave actions remain as explicit controls at the bottom of the detail screen.

Project card member counts include the creator exactly once plus active member user IDs. A newly created/imported project displays one person even before a membership row exists; this does not assign the external project creator a Leader role.

CreateProjectModal opts into compact modal/actions: 1000px maximum width, 20px heading, 13px inputs/labels, 36px footer buttons, reduced upload area and spacing. Its live preview uses the shared ProjectCard. Other project dialogs retain their default sizing. Browser checks cover preview updates and visible footer controls at desktop/mobile widths.

The creation selector is labeled “Loại dự án”, ordered “Tạo mới” (Internal=0), then “Có sẵn” (External=1). Initial selection remains Có sẵn, with Completed=2. Switching to Tạo mới sets Active=1; switching to Có sẵn sets Completed=2. The UI submits the selected status explicitly. The creation progress selector is hidden; status is derived from the selected type and cannot be manually changed in this popup. These are creation defaults only; historical status values/data are unchanged.

Removed ProjectInboxModal and its unused frontend myRequests wrapper. Project-level member/recruitment management in the detail screen is retained. No database changes.

Project detail density was reduced: panels use 16px padding, headings 15px, actions 36px high, hero cover 280×160px on desktop, smaller content tiles/tabs/resource cards and 300px sidebar. Compact variants are opt-in so other screens keep their sizing. Browser checks cover detail action size, overview/member/document/media tabs and overflow at 320/768/1024/1440px.

Project image camera/preview/confirmation and full-image blur display:
[project-images.md](project-images.md). Includes the small backend portfolio image
projection fix and focused verification results.

The title pencil now opens the dedicated two-field summary popup; the old combined
editor was deleted. See [project-summary-edit.md](project-summary-edit.md).

The detail tab bar now has 20px top spacing and a Settings tab containing visibility
and project management actions. See [project-settings-tab.md](project-settings-tab.md).

Overview now has its own owner editor, per-section writing guides and auto-growing
textareas. See [project-overview-editor.md](project-overview-editor.md).

Personal review uses a top-right underlined pencil and a compact icon-labeled popup
with growing inputs. See [project-personal-review.md](project-personal-review.md).
