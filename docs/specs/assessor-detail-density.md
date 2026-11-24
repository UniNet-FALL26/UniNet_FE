# Assessor detail density

- Scope: all assignment detail tabs (results, information, schedule, report,
  history). Keep report rules, draft persistence, meeting actions and API calls.
- Use a small white project header, neutral thin card borders, 12px body text,
  14px card titles and compact spacing. Remove colored side/top stripes,
  decorative section bars, large numbered badges and colored card panels.
- Tabs use a simple active underline. Blue remains for actions and small state
  indicators. Desktop buttons 36px; mobile targets 44px.
- Keep changes scoped: AssignmentDetailContent styles and a detail-specific
  assessor style export used by the detail screen and AssessmentForm only.
- Plan: extend current browser fixture for live Metro, all tabs and neutral
  border assertions; implement compact style overrides; verify and hand off.
- Verify: node tests/assessor-detail-browser-check.cjs with
  ASSESSOR_DETAIL_TEST_ORIGIN=http://localhost:8086; focused assessor tests,
  ESLint and TypeScript. Check 320/390/768/1024/1440px, report inputs, criteria
  expansion and no horizontal overflow. No external mutations/dependencies.
