# Project dates

## Current contract: start and end only

- Planned completion was removed from Settings, sidebar, model/API and active DB
  by 20261118060015_RemoveProjectExpectedEndDates (applied to configured Neon DB).
  Timeline now sends only startDate/actualEndDate. ActualEndDate is displayed as
  “Ngày kết thúc”, including popup title and validation messages.
- Keep start owner-editable with creation-day default. End-date restrictions,
  quick month/year picker, confirmations and save/cancel behavior remain.
- Timeline and detail browser regressions passed. TypeScript has only existing
  opportunities/assessor errors. Earlier planned-date notes below are historical.

## Editable start date

- Creation still defaults start to the Vietnam creation day. Owner can correct
  it later in Settings, including for projects with startDateIsCreationDate=true.
- Remove frontend/API start-date locks; keep ownership and date-order validation.
  General details patches that omit start still preserve the creation default.
- Retain the existing flag for completion-date autofill compatibility. No schema
  migration. Verify both timeline/details updates and browser save/reload.
- Verified: 29 ProjectHubTests pass; Chrome timeline fixture passes editing and
  reloading the start date even with the creation-default flag present.

## Latest creation adjustment

- User retained the existing editable Settings behavior. Remove only the optional
  expected-end-date field and helper from CreateProjectModal. Creation no longer
  sends expectedEndDate; the backend's optional contract remains compatible.

- Quick navigation: clicking the centered month/year opens a 12-month grid;
  clicking the year opens paged year choices (12 per page). Choose year, then
  month to return to days. Navigation never changes the selected date or saves;
  existing date bounds and Confirm/Cancel remain authoritative.
- Verify leap-day navigation across year pages, cancel/reopen draft isolation,
  mobile quick-picker layout and the existing timeline browser regression.
- Verified: timeline Chrome fixture passed including 2028 leap-day navigation,
  quick month/year selection on mobile and unchanged save/cancel/bounds flows.
  Mobile picker screenshot inspected. TypeScript has only existing unrelated errors.

- Popup polish: reduce shared HubModal widths/header typography/icon/padding;
  give the timeline calendar a 440px maximum width. Preserve readable dates,
  scrollable body, footer visibility, focus trapping and existing save/cancel.
- Verify calendar dimensions/title on desktop and mobile; regress timeline,
  recruitment and links dialogs against the shared frame change.
- Verified all three Chrome fixtures (timeline, recruitment, links), including
  calendar width/title assertions, mobile sizing, focus/Escape and save/cancel.
  Visually inspected calendar, summary, recruitment and links screenshots.
- Shared defaults: 600px narrow, 880px compact wide, 960px wide; title 17px desktop
  /16px mobile, 32px header icon, 18px body padding. Calendar overrides maxWidth
  to 440px. Existing TypeScript errors remain outside these components.
- Updated links fixture's old date-input and verification-card expectations to
  current popup controls and completed-project-only card behavior after pull.

- Latest adjustment: removed the separate project-status section and selector
  from Settings at user request. Date controls and management actions remain;
  completion uses the management button and existing confirmation dialog.

## Settings reference redesign (2026-11-18)

- Match supplied reference: three outlined date controls in one desktop row;
  separate status section; paired blue completion and red deletion action rows.
- Keep date popup, owner permissions, fixed start and management confirmations.
  Stack controls on narrow screens. Status selector exposes current status and
  supported completion action only; do not invent reopen/moderation transitions.
- Plan: restyle settings; wire status menu to existing completion confirmation;
  verify date regression, status cancel and management buttons in Chrome.
- Validation: existing timeline browser fixture; TypeScript check. Reuse current
  React Native styles/icons and HubModal; no new dependency or backend changes.
- Implemented in ProjectSettingsPanel with SettingsSection headers, outlined
  date buttons, current-status selector and completion/deletion action strips.
  Status selector opens the existing completion confirmation; completed/rejected
  and non-owner states remain non-editable. Management permissions unchanged.
- Chrome checks passed date persistence/cancel/error/bounds, desktop aligned
  dates, mobile layout and completion/deletion confirmation cancellation.
  TypeScript still reports only existing opportunities/assessor errors.

## Settings date popup (2026-11-18)

- Scope: owner settings only, reuse HubModal and existing timeline PATCH; no new dependencies.
- Acceptance: separate update button for each date; popup shows selected date above
  an inline Vietnamese calendar, followed by Confirm/Cancel. Cancel discards draft;
  Confirm persists only the selected change while retaining other timeline dates.
- Preserve fixed creation-date start, date ordering, actual-end maximum today,
  clearable nullable dates, duplicate-submit lock and server error feedback.
- Plan: add calendar popup; connect settings buttons; verify cancel/save/error,
  constraints, locked start and mobile layout with mocked API browser fixture.
- Commands: `node tests/project-timeline-browser-check.cjs`, `npx tsc --noEmit`,
  `npx eslint src/components/projects/hub/ProjectTimelineDateModal.tsx src/components/projects/hub/ProjectSettingsPanel.tsx`.
- Verified: Chrome fixture passed cancel/reopen, independent start/expected updates,
  reload persistence, clear, server-error retry, disabled dates, creation-date lock,
  Escape and 375px layout. Desktop/mobile screenshots visually inspected.
- Current checks: TypeScript has no errors in the changed components; repository
  check still fails in opportunities.tsx and AssessorProfilePosts.tsx. ESLint is
  unavailable locally (`eslint/config` cannot resolve); lint did not complete.
- Review: retains existing timeline payload and date validation; modal draft stays
  local until confirmation; busy lock prevents dismissal and repeated writes.

## Existing timeline behavior

- CreateProjectModal no longer shows/sends expectedEndDate. Start is assigned
  by backend using creation day in UTC+7. Settings date editing is retained.
- Owner Settings shows Thời gian dự án with start, expected end and actual end.
  Server flag startDateIsCreationDate records the creation default but no longer
  locks editing. Existing records can retain blank dates; no fallback invents dates.
- Save sends only `timeline`, preserving documents/results/etc. Errors retain
  input; busy lock prevents duplicate saves. Nullable fields can be cleared.
- Creation's ProjectDateField uses native HTML date input on web and the existing
  community DateTimePicker on Android/iOS. Settings uses ProjectTimelineDateModal's
  inline calendar on all platforms. No new dependencies. Native runtime not tested.
- Sidebar always shows expected and actual end independently, regardless of status.
- Backend storage migration: 20261118030659_AddProjectTimelineDates must be applied
  before using this frontend with the updated backend. See UniNet_BE/docs/handoffs/project-timeline.md.
- Browser fixtures passed creation payload/date selection, settings save/clear,
  reload persistence, mobile layout and project regression flows. Backend provides
  actual automatic-start/permission/date validation tests (31 cases passed).
- Production web export: `npx expo export --platform web --max-workers 2
  --output-dir dist/project-timeline-check` passed, 115 routes. TypeScript reports
  existing opportunities.tsx and AssessorProfilePosts.tsx errors only.
