# Compact assessor assignment detail

- AssignmentDetailContent now uses a white project header, smaller type/spacing,
  underline tabs, neutral card borders and neutral result/conclusion panels.
  Removed decorative heading bars; semantic status badges remain colored.
- assessorDetailStyles overrides are scoped to the assignment screen and
  AssessmentForm. Other assessor list/profile styles keep their existing values.
  Schedule/report cards have equal 1px neutral borders, no side/top stripes or
  numbered heading emblems. Buttons use 36px desktop/44px mobile sizes.
- Report form uses smaller controls, neutral preview/criterion panels, compact
  score choices with hitSlop and factual section wording. Draft, score, condition,
  report-confirmation and meeting handlers are unchanged.
- Browser fixture supports ASSESSOR_DETAIL_TEST_ORIGIN=http://localhost:8086
  for current Metro source, retaining static-export mode when unset.
- Chrome checks passed all tabs at 320/390/768/1024/1440px, active meeting/report
  states, criteria expansion, neutral borders, draft editing, button bounds and
  no overflow. Screenshots: dist/assessor-detail-web/checks/.
- Focused ESLint clean; 15 unit checks pass. One existing stale test expects the
  removed evidence tab/attachments, contradicting both pre-change source and the
  browser fixture. Left unchanged. TypeScript still reports only existing errors
  in opportunities.tsx and AssessorProfilePosts.tsx. Native simulator not run.
