# Partner community

## Objective and acceptance
- Desktop header matches the student header reference: inset white rounded frame, fine blue border, logo plus UniNet wordmark, left-aligned horizontal tabs with blue selected background, right-aligned bell and circular profile avatar/chevron after a vertical divider. Profile moves from the main desktop menu to the account area; mobile retains all five footer tabs. Existing notification inbox/badge and profile routes remain functional. Avatar loads from the current partner profile and falls back to a profile icon on missing/broken images.
- Navigation order: Cộng đồng, Tuyển dụng, Tổng quan, Quảng cáo, Hồ sơ.
- At widths >=1024px, show navigation in the partner header and omit the footer. Below 1024px, hide the entire header and show the footer. Resize must preserve the current route and selected tab.
- Partner's Cộng đồng tab opens the same community feed as students inside the partner layout.
- Community posts and comments load through existing community APIs; the partner footer remains selected on Cộng đồng.
- Recruitment still opens jobs and their applicant management routes.

## Implementation plan
0. Responsive navigation update: extend the existing browser check for tab order, header/footer visibility and tab positioning at 320, 390, 768, 1023, 1024, and 1440px; prove failure, then reuse the tab bar with a header placement in the company layout.
1. Add a browser regression check: partner login, community tab, fixture post, comments, reload and recruitment navigation. Confirm failure before changing routes.
2. Add `src/app/(company)/company-community.tsx` re-exporting the existing student feed screen, following the student community route pattern. Update only the partner community tab destination.
3. Run the browser check, `npx tsc --noEmit`, and `git diff --check`; inspect mobile and desktop screenshots.

## Structure and conventions
Expo Router routes live in `src/app`; the existing feed is `(tabs)/index.tsx`, with `(tabs)/community.tsx` re-exporting it. Reuse it without copying the feed or mounting the student layout.

```tsx
export { default } from '../(tabs)/index';
```

## Verification and boundaries
Use Playwright with deterministic API fixtures in `tests/partner-community-browser-check.cjs`, executed with `node tests/partner-community-browser-check.cjs` against `http://localhost:8081`.
Always preserve partner authentication guards and applicant routes. No new dependencies, backend changes, or unrelated edits. Existing community behavior is inherited from the shared screen.
