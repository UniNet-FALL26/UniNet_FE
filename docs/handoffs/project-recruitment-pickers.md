# Recruitment date/time and competency pickers

## Short introduction

- Optional multiline "Giới thiệu ngắn" appears before deadline in create/edit.
  Uses existing recruitment.description (5000-character API limit); trims on
  save and stores null when blank. Existing text is prefilled, cancel discards
  edits, and read-only overview displays a labeled introduction when present.
- Chrome fixture covers create, prefill, edit/cancel, trimmed update and clearing.

## View and edit flow

- Removed draft submission from the recruitment UI. New postings publish with
  status 1. Opening any existing recruitment shows ProjectRecruitmentOverview,
  including status/deadline, positions, competency cards and requirements.
- Explicit Edit mounts a fresh editor; cancel/Escape discards edits and returns
  to saved overview. Saving updates parent project state before returning to
  overview. New creation closes back to requests; reopening displays overview.
- Close recruitment lives in overview and submits only saved data with status 2;
  duplicate requests/dismissal are blocked while busy, errors remain retryable.
  Historical draft records remain readable and can be published from Edit.
- Verified Chrome desktop/mobile: existing posting opens without text inputs,
  explicit edit/cancel restores saved values, update returns to overview, close
  updates status, new publish/reopen displays overview and no request sends
  status 0. Catalog/date-time regression passes. TypeScript reports no errors
  in changed recruitment/technology components. Mobile overview inspected.

- Selected competencies in the recruitment form render as wrapping logo/name
  cards matching the picker selection styling, without checkmarks. Clicking the
  field still opens the picker; catalog lookup supplies logos for saved values.

- RecruitmentModal retains its draft while sibling HubModals open for deadline
  and competencies. Confirm copies picker state back; cancel/Escape discards it.
  API writes occur only on publish/update/close recruitment actions.
- Deadline retains the original ISO timestamp until explicitly edited. Picker
  reuses timeline calendar with an optional content slot for hour/minute fields;
  values are shown as Vietnam time and converted with explicit +07:00 offset.
  Empty date clears deadline; publish validates a future instant.
- Catalog uses skillService.getSkills with search, loading/error/retry and
  multi-select. Existing uncatalogued values remain selectable/removable. Preserve
  existing skill/technology classification; newly selected values follow the
  existing technology default. Limit merged selection to 40.
- Chrome recruitment fixture passes cancel/confirm, catalog retry/search,
  per-position preservation, invalid hour, exact UTC+7 timestamp, draft/publish/
  close and mobile picker bounds/Escape. Desktop/mobile screenshots inspected.
- TypeScript has no errors in changed files; existing opportunities.tsx and
  AssessorProfilePosts.tsx failures remain. Corrected prior guide hitSlop prop
  placement while validating the accumulated frontend changes.
- Run: PROJECT_RECRUITMENT_TEST_ORIGIN=http://localhost:8091
  PROJECT_RECRUITMENT_CLIENT_RENDER=1 node tests/project-recruitment-browser-check.cjs.
  Browser fixture clears controlled search input with keyboard events.
