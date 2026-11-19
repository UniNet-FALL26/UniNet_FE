# Community opportunities

## Scope and acceptance
- Student community feed shows “Cơ hội mới dành cho bạn”, with the three newest published, currently open jobs.
- At widths >=1280px, card sits to the right and remains visible while the feed scrolls. The feed retains its original 650px centered content container, independently of the card. Narrow screens: card appears above posts.
- Each item shows company logo/fallback, title, company, location/work mode, posting age, and save control. Links open the job or all opportunities.
- Loading, empty, failure/retry and duplicate save prevention are handled.
- Existing opportunity ordering remains unchanged unless `sort=newest` is requested.

## Implementation plan
1. Add optional `sort=newest` to the existing opportunity list contract; verify newest-first pagination and default ordering in backend tests.
2. Add a focused community card, then place it beside the feed on wide screens and in its header on mobile.
3. Verify responsive layout, stationary sidebar, links, saves, empty/error states and the three-item request in browser tests.

## Validation commands
- Backend: `dotnet test UniNet.Tests/UniNet.Tests.csproj --filter FullyQualifiedName~CommunityOpportunityTests`
- Frontend: `node tests/community-opportunities-browser-check.cjs`
- Type check: `npx.cmd tsc --noEmit`

## Boundaries
No database migration, new dependencies, or changes to feed pagination. API keeps student authorization and existing publication/deadline checks.

## Verification results
- Backend ordering test passed: newest sorting occurs before pagination, excludes draft/expired/scheduled jobs, rejects invalid sort, and preserves default deadline ordering.
- Browser checks passed at 320, 768, 1080, 1280, 1440 and 1920px: centered posts, stationary sidebar, three-item request, save/unsave, detail/all links, empty state and retry.
- TypeScript reports existing errors in opportunities and assessor posts; no errors were reported in the new card, community screen or opportunity service.
- API and frontend must both run the updated code for `sort=newest` to take effect.
