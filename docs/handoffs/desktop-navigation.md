# Desktop navigation

- `src/components/app-tabs.shared.tsx`: web >=1024px shows a fixed top header with brand link and all 8 destinations from existing tabs/shortcuts; bottom navigation and shortcut popup are hidden. Compact spacing below 1200px keeps all links on one row. Active state includes nested paths and exposes aria-selected.
- Mobile/native retain the bottom tab bar and popup. Menu closes on route or desktop breakpoint changes. Route destinations and screen actions remain unchanged.
- `tests/desktop-navigation-browser-check.cjs`: mocked login, 4 desktop widths, single-row height/no overflow, all destinations/active states, brand home navigation, 390/768px mobile menu and resize with an open menu. Screenshots in ignored dist/desktop-navigation-verification.
- No backend or dependency changes. Physical native devices were not tested.

- Header visual revision: inset rounded blue/white surface, primary destinations on the left, notification/message/profile icon actions on the right. No search input. Profile displays the authenticated owner portfolio avatar, falls back on missing/broken images, and refreshes on route changes. Requests are aborted on cleanup and avatar state is scoped by account ID. Browser coverage includes loaded avatar, no-photo and broken-photo fallback.

- Latest header: community, workspace, opportunities, groups, projects, messages, articles in the main row; notification/profile actions at the right. Removed desktop More and kept search absent. Projects reuses the existing project explorer through /projects; articles uses the existing /community feed. Mobile shortcuts remain unchanged. Tests cover all 9 desktop destinations, no More/search, avatar fallback and single-row layout.

- Removed the Articles header button at user request. /community remains available and selects Community. Header now has 8 destinations.
