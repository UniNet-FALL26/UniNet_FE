# Recruitment pickers

## Short introduction

- Add optional multiline introduction before deadline in create/edit form.
  Use existing recruitment.description API field (server limit 5000 characters).
- Prefill saved content; trim on save and send null when cleared. Cancel must
  restore saved text. Read-only overview labels and displays the introduction.
- Verify create, edit, cancel and clearing through the existing Chrome fixture.

## View before edit

- Remove the draft action from recruitment UI. New postings submit status 1.
- Opening existing recruitment shows read-only deadline, status and positions
  (quantity, competency cards, additional requirements). Explicit Edit opens the
  existing form. Cancel discards edits and returns to the saved overview.
- Keep closing recruitment supported; only submit saved data from the overview.
  Existing backend draft records remain readable; no destructive API migration.
- Plan: add overview/editor switch, remove draft submit, verify create/reopen/
  edit/cancel/update/close plus picker regression in desktop/mobile Chrome.

- Objective: deadline opens a date/time dialog; each position opens a searchable
  skill/technology catalog. Confirm returns to the unchanged recruitment draft;
  cancel discards picker edits. No recruitment write until draft/publish/close.
- Deadline: display and edit Vietnam time; preserve existing timestamp until
  explicitly edited. Nullable; publishing requires a future instant.
- Catalog: use skillService.getSkills, maintain separate technology/skill arrays,
  preserve historical selections, handle loading/error/retry and empty search.
- Stack/style: existing React Native, HubModal, timeline calendar and catalog API.
  Match existing compact controls; e.g. `<HubAction compact title="Xác nhận" />`.
- Files: ProjectCommunityModals.tsx wires local draft; ProjectRecruitmentPickers.tsx
  owns picker drafts; ProjectTimelineDateModal.tsx accepts extra time controls.
- Plan: extend calendar slot, implement pickers, wire form, update Chrome fixture,
  run regression and TypeScript. Keep prior timeline changes intact.
- Commands: `node tests/project-recruitment-browser-check.cjs`;
  `node node_modules/typescript/bin/tsc --noEmit`; `git diff --check`.
- Validation: confirm/cancel, exact UTC+7 timestamp, preserved form fields and
  per-position arrays, catalog retry/search, desktop/mobile, publish validation.
- Boundaries: no API/schema/dependency changes; no automatic network save from
  picker confirmation; reuse shared modal focus/Escape behavior.
