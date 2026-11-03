# Company jobs redesign

## Header clipping correction
- Removed the desktop company header's 10px bottom margin in `(company)/_layout.tsx`. The scroll viewport now starts at the actual header bottom instead of below an extra opaque gap.
- Verified actual layout styles in a browser fixture: blank band 10px → 0px, header height unchanged at about 70px, and viewport remains flush with the header after scrolling 567px. Mobile header behavior is unchanged.

## Detail color refresh
- Match the supplied light-blue reference using a pale blue page, near-white cards, fine blue borders/dividers, blue icon tiles, and a softly tinted applicant table.
- Keep all labels, live data, section order, status rules, CV/actions, and fixed mobile header unchanged. Scope is `job-detail.tsx` styles and decorative icon treatment.
- Verify existing UI tests, TypeScript, and desktop/mobile browser rendering; compare preview text before/after where available.
- Applied page-local blue surfaces/dividers/icon tiles, tighter corner radii, muted metadata, soft shadows, consistent status colors, and a tinted desktop table header. No global theme or data changes.
- Preview text matched the prior mobile preview exactly. Isolated desktop/mobile layouts showed no horizontal document overflow; eight UI tests and TypeScript passed.

## Scope and acceptance
- Match reference 2: briefcase heading, full create button, white panel, search/filter toolbar, seven-column desktop table, pagination footer. Remove the blue summary block.
- Preserve live company data, detail/edit routes, confirmation before close/reopen/delete, and mobile cards. Applicant management now lives in job detail. Keep status available in advanced filters and on non-published rows.
- Use existing React Native / Expo components and color tokens; no dependencies or API changes.

## Applicant consolidation plan
1. Show applicant cards below 900px in job detail: identity, status, application date/round, submitted CV, optional message/score, and five status choices. Preserve status transition rules, confirmation/errors, and desktop table.
2. Move list/dashboard applicant links to job detail and remove the standalone applicant screen and its management link. Update backend notification targets and normalize legacy notification links to job detail.
3. Verify applicant CV/status interactions, terminal/missing-CV states, navigation and notification mapping; run frontend typecheck and focused recruitment notification backend tests. No data or API schema changes.

## Plan and verification
1. Replace heading and panel layout in `src/app/(company)/jobs.tsx`; verify desktop/mobile rendering.
2. Wire advanced status filter and server pagination (10/20/50); reset page on search/filter/size changes and handle the last row disappearing.
3. Run `npx tsc --noEmit`, `node tests/company-jobs.test.cjs`, and browser verification. Review diff for route/action regressions.

## Conventions and boundaries
Use existing `StyleSheet.create`, `CompanyIcon`, `Card`, and service DTOs, e.g. `companyService.listJobs({ page, pageSize }, signal)`. Keep debounce and request cancellation. Backend changes are limited to notification destination and its regression assertion. Do not change authentication, unrelated pages, or commit user work.

## Verification results
- TypeScript, all eight recruitment UI tests, and six notification utility tests pass. Coverage includes applicant CV/status interactions, cancellation, terminal statuses, missing CV, failed updates, and legacy notification migration in addition to existing navigation checks.
- Browser checked isolated desktop and compact renders using sample data; desktop has no document overflow. Test preview substitutes icons and shared shell components. Live `/jobs` redirects to login, so authenticated API/browser interaction remains unverified.
- Search remains title-only because the existing API searches `Job.Title`; the placeholder reflects that contract.

## Compact refinement
- Reduced heading to 23px, toolbar controls to 38–40px, table rows to 76px, and table/body text to 12–14px.
- Status filter opens an anchored vertical dropdown without moving table content; selection closes the menu. Updated regression test covers menu visibility and selecting the active status again.
- Below 600px, remove the outer panel surface, border, shadow, and padding; retain individual job cards and page gutters. Tablet and desktop panels remain intact.
- Mobile toolbar keeps search and an icon-only filter on one row. Job cards have no action buttons; the entire card is an accessible link to that job's detail page, with pressed feedback. Applicant counts remain visible. Desktop table actions and detail-page actions remain available.

## Detail header actions
- `src/app/(company)/job-detail.tsx` places compact edit/close-or-reopen/delete icons beside the page title. The preview eye button and its modal were removed as requested. Applicant management remains accessible from the applicant section.
- Close/reopen updates the job after confirmation; confirmed delete returns to the list. Failed actions display an error and retain the confirmation dialog.
- Checked isolated desktop rendering and tested edit routing, cancel/confirm status changes, reopening, and delete navigation.
- Below 600px, a 56px header sits outside the detail ScrollView, with back on the left and job actions on the right. Hide the breadcrumb and page title/subtitle, so the job card starts directly below the header. Desktop layout remains intact. Browser fixture confirmed header Y stays at 0 after scrolling content by 604px.

## Applicant consolidation
- Removed `src/app/(company)/applicants.tsx`; dashboard and job-list applicant actions open the corresponding job detail. Removed the redundant management link from detail.
- Below 900px (and native), render one card per applicant with identity/date/round/status, submitted CV, optional message/score, and status buttons. Desktop retains its table. Existing status rules and confirmation/error handling apply to both layouts.
- Backend recruitment notifications now target job detail. Frontend notification validation maps old applicants links to detail when `jobId` is present, otherwise to jobs; invalid links remain rejected.
- Browser sample confirmed card layout, five status choices and no document overflow. Authenticated live API interactions remain unverified.
- Validation: frontend `npx tsc --noEmit`, eight recruitment UI tests, six notification tests, and both backend `RecruitmentNotificationTests` cases passed. Backend test command used `--no-restore --filter FullyQualifiedName~RecruitmentNotificationTests -m:1 -p:BuildInParallel=false -nodeReuse:false`.
