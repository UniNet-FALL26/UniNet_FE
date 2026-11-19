# Student template default — 2026-11-01

User requested the first profile template for new/login student accounts, available information only, removal of the ordinary starter UI and its display switch.

- Owner `/ (tabs) / profile` and visitor profile now render `ProfileTemplateRenderer` directly. No content threshold or legacy `showPortfolio` flag can select the starter. Developer Modern/blue is already the API/gallery default; saved template/theme preferences remain intact.
- Removed the starter-only photo handlers from the owner screen. The existing pencil/editor remains the place to update profile fields and photos.
- Settings retains template selection and account/verification controls. Removed the display switch, write/retry state and associated navigation lock. Registered school reads remain available for the verification form.
- Modern hero omits absent headline, biography and portrait; empty sections/metrics were already suppressed. Footer avoids an orphan separator when metadata is missing. No sample content is copied into user profiles.
- Visitor data continues to respect backend redaction, including older `showPortfolio=false` records. No backend, schema, auth or automatic preference writes were introduced.

Validation: TypeScript and static web export passed. 30 focused Node tests passed, including new empty/default and legacy-disabled rendering regressions, saved appearance, switch absence, empty/partial sections and editor behavior. Isolated mocked Chrome check passed at 320/768/1440px: login → personal tab, restored session → personal tab, first template, partial data, editor route, settings, visitor rendering and zero profile/preference writes. Screenshots reviewed in ignored `dist/student-profile-default-check/`.

Commands (from FE):
```powershell
npx tsc --noEmit
npx expo export --platform web --output-dir dist/student-default-web
node --test tests/student-profile-default.test.cjs tests/profile-empty-sections.test.cjs tests/profile-draft.test.cjs tests/profile-editor.test.cjs tests/profile-hero-media.test.cjs
node tests/student-profile-default-browser-check.cjs
```
Browser fixture default origin: `http://127.0.0.1:8105`; override with `PROFILE_TEST_ORIGIN`. Use an extensionless static-route server; temporary helper is ignored `dist/student-default-preview.py`.

Known existing issues: static login emits React hydration #418, reported separately by the fixture; no profile runtime errors occurred. `/profile` is shared with the company route, so the browser fixture enters via the student's Personal tab (also after session restoration). Route disambiguation was not changed. Older standalone `student-profile-browser-check`, `student-starter-refresh-browser-check` and `portfolio-display-browser-check` describe the removed onboarding/toggle UX; use the new default-profile fixture for this flow. Shared starter component remains unmounted; no source assets were deleted.
