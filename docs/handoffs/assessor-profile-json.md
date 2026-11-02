# Assessor professional profile — 2026-11-02

- `/assessor-profile` reads common fields plus `assessorJson` from the existing `/profile/me` API. All nine professional fields are displayed across five cards, each with its own modal for create/edit and confirmed group clear. See assessor-profile-cards.md.
- `src/services/assessor-profile.service.ts` defines the typed profile contract and PUT/DELETE calls to `/profile/assessor`. Existing student/partner clients and payloads are unchanged.
- Editor supports common name/nickname/bio/contact fields; existing avatar/cover URLs are retained on save. Clear removes only professional data. API failures preserve input and allow retry. Saves ignore stale account responses.
- Explicit `assessorJson: null` means cleared data: legacy major/university values must not be restored as fallback. Fallback supports only older API fixtures missing the property entirely.
- Backend and migration requirements: `UniNet_BE/docs/handoffs/user-role-json.md`. New API/schema must be applied before enabling editor against that backend.
- Verified TypeScript and `node tests/assessor-profile-crud-browser-check.cjs` against localhost:8081, including all fields, failures/retries, clearing, persistence and 320/390/768/1440px. Screenshots: ignored `dist/assessor-profile-crud`.
