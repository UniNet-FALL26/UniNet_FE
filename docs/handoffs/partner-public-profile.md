# Partner date and public profile

- Business editor accepts/displays `dd/mm/yyyy`; introduction input converts to ISO for the existing API, validating actual dates and rejecting future dates.
- Recruitment details render the existing `(company)/profile.tsx` screen with `publicProfile` and `onOpenJob`. Public mode skips private partner API calls and hides editing, upload, settings, verification management, logout and job management.
- Hero photo previews and gallery remain readable. Introduction/business/gallery use existing cards. Public posts use the author-filtered community feed rather than the student's own posts.
- Backend public partner response now includes introduction metadata. Community feed accepts optional `authorUserId`, filtering before pagination and retaining published/nondeleted restrictions.

## Verification

- Date regression tests and existing owner introduction browser checks pass.
- Student browser fixtures pass at 375/1440: shared screen, hidden management actions, photo preview, business date, company posts, open jobs and return navigation.
- Backend targeted tests: 7 passed (partner introduction and community profile posts).
- Full TypeScript check remains blocked by pre-existing missing styles/icon typing in opportunities and incorrect CommentModal props in AssessorProfilePosts; no new errors from this change.
- Browser checks use mocked API responses; backend service tests run separately against SQLite.
