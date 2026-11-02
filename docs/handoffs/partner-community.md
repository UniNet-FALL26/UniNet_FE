# Partner community

- Partner footer Cộng đồng now routes to `/(company)/company-community`, reusing `(tabs)/index.tsx` exactly as the student community route does. Importing the screen does not mount the student layout or redirect partner accounts.
- Navigation order is now Cộng đồng, Nhắn tin, Tuyển dụng, Thông báo, Hồ sơ. Advertising moved to Partner Settings; Overview remains reachable through the brand link. At widths >=1024px, the header shows community/messages/recruitment plus the existing bell/profile actions; smaller widths use the five-tab footer with Student-matching dimensions. `CompanyTabBar` accepts `placement="header"` for horizontal icon/text styling. Resize preserves the route. Tab selection is exposed through `aria-selected` on web and `accessibilityState` on native. See `partner-navigation.md` for the latest regression checks.
- `/(company)/applicants` remains available from job and dashboard applicant actions; no applicant logic changed.
- Regression: `node tests/partner-community-browser-check.cjs` against Expo web at `http://localhost:8081`. Uses isolated partner login/API fixtures; verifies feed, comments, selected tab, reload, recruitment navigation, tab order, exclusive header/footer visibility, navigation positioning, and screenshots at 320/390/768/1023/1024/1440px. Failed before both the feed and responsive navigation changes; passed afterward.
- TypeScript verification: `npx tsc --noEmit`. No backend changes or new dependencies.

## Desktop header design
- Header sizing now matches `app-tabs.shared.tsx`: 68px inner height, 1600px maximum inner width, 18px outer radius, 30x34 logo, 23px wordmark, 44px nav items and 38px avatar. Below 1200px, use the student's compact menu spacing/type sizes; below 1024px, retain footer navigation. Main partner destinations are unchanged.
- Partner desktop header follows the student reference: inset white frame with rounded blue border, logo/UniNet wordmark, horizontal main menu and active blue background, then bell and circular avatar/chevron after a vertical divider.
- `CompanyHeaderActions.tsx` reuses the existing notification bell and loads the current partner avatar from `/profile/me`, refreshing on route changes with request cancellation. Missing/broken avatars show the profile icon. Profile remains the last footer tab on mobile; desktop renders it in the account action area.
- Browser regression checks include profile/inbox navigation, unread badge, avatar load/fallback and readable menu labels at the desktop breakpoint.
