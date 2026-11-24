# Assessor assignment list

- Scope: `src/app/(assessor)/assessor-assessments/index.tsx`. No API/business logic changes.
- Removed decorative eyebrow/heading icon, shadowed cards, large corners and saturated filter button. Compact 20px title, 12px secondary text, 13px project names and 36px thumbnails. Single white list surface with 1px neutral row separators, compact status badges, quiet detail links. Labels/dates aligned across desktop rows; phone layouts wrap dates and show status below project info. Refresh/filter and pagination retain 44px mobile targets.
- Existing refresh, status filtering/reset-to-page-one, pagination, row detail links, loading/error/retry/empty states and image fallback preserved. Project detail loading still supplies row titles/fields; no new dependencies.
- Chrome mocked browser check: `tests/assessor-assignment-list-browser-check.cjs`, screenshots `dist/assessor-assignment-list-check/list-*.png` (ignored). Covers widths 1440/1024/768/390/320, long title, missing report deadline, compact row height, no shadows/overflow, all status filters, empty state, pagination, API error/retry and opening assignment detail. No live mutations.
- Focused ESLint passed. Full TypeScript check reports existing unrelated errors in `src/app/(tabs)/opportunities.tsx` and `src/components/assessor/AssessorProfilePosts.tsx`; none in this screen. Native simulator not run.
