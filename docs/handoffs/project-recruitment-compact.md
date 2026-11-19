# Compact recruitment editor

- RecruitmentModal uses the existing compact HubModal capped at 700px. Field gains an opt-in compact size (38px single line / 68px multiline), leaving other editors unchanged.
- Visible fields: deadline; per position name, quantity, combined skills/technologies and additional requirements. Introduction, job description and benefits editors removed. Existing hidden values remain in payload to avoid erasing saved data.
- Combined input preserves the existing API arrays: previous skill tokens remain skills, previous technology tokens remain technologies, new tokens enter technologies. Removed tokens leave both arrays. Raw input state preserves separators while typing.
- Existing position IDs, validation, add/remove, draft/publish/close and save endpoint remain unchanged. Backend unchanged.
- Browser check: tests/project-recruitment-browser-check.cjs covers desktop/mobile, sizing, removed fields, merge payload, preserved hidden data, cancellation, validation and status mutations. Screenshots saved outside repo at workspace root.
- Local Expo SSR stalled despite successful bundling. Browser checks passed against the real Metro client bundle with PROJECT_RECRUITMENT_CLIENT_RENDER=1 and PROJECT_RECRUITMENT_TEST_ORIGIN=http://localhost:8088. This optional fixture bootstrap uses the React Native Web flex root and bypasses SSR only.
