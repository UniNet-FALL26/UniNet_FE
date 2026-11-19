# Partner navigation

- `CompanyTabBar` now orders mobile tabs as **Cộng đồng → Nhắn tin → Tuyển dụng → Thông báo → Hồ sơ**. Advertising and Overview no longer appear in either navigation bar. Brand link still opens the existing dashboard.
- Desktop primary navigation is community/messages/recruitment, followed by the existing notification bell and profile action. No duplicated notification/profile entry.
- Footer matches Student styles: icon 23px, text 10px, 62px tab targets, active underline, safe-area bottom padding of at least 8px, matching border/shadow. A live Student fixture confirms equal footer height. Notification badge reuses `NotificationsProvider` and synchronization; 99+ formatting retained.
- `src/app/(company)/company-messages.tsx` exports the existing messages screen under the Partner layout/role guard. That screen remains the existing inbox placeholder; this change does not implement chat services or send messages.
- Partner-only **Công cụ đối tác → Quảng cáo** row in `SettingsPanel` opens the existing advertisement route from embedded profile Settings and standalone Settings. Student Settings unchanged.
- New `tests/partner-navigation-browser-check.cjs` first failed against the old tab order, then passed for 320/390/768px footers, comparison to Student height, unread count, active routes, retained Partner messages layout, desktop 1024/1440px header and advertising from both Settings entry points. Navigation test queries accessible active tablists because root Stack can retain prior hidden layouts.
- Existing Partner community and fixed mobile profile header browser suites pass; Student Settings browser suite passes. TypeScript and diff whitespace checks pass. Visually inspected footer-390/header-1440 screenshots under ignored `dist/partner-navigation`.
- Static web export passes to `dist/partner-navigation-web` (88 routes, including grouped/public Partner messages paths).
- No backend, authentication, dependency or schema changes. Browser APIs are fixtures; no real campaigns/messages/accounts were modified. Physical devices were not exercised.
