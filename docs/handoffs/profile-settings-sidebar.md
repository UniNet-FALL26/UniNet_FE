# Profile settings sidebar

- Profile uses a two-column layout on web >=1200px, max width 1800px: flexible profile left, 400px settings right. Main profile and sidebar scroll independently; mobile/native layout remains one column.
- `SettingsPanel.tsx` contains the existing settings screen logic. The `/settings` route wraps it; embedded mode omits the standalone top bar, identity and branding footer.
- Embedded display saves call `onPortfolioChanged` so the left profile switches immediately after API success. Loading/error/retry, verification/account and policy dialogs, template navigation and logout reuse existing behavior.
- Browser coverage in `settings-browser-check.cjs`: 1200/1440/1920px split layout, smaller-screen fallback, profile display synchronization and sidebar policy dialog, followed by existing standalone settings checks. Requests are mocked; no real settings changed.

- Desktop spacing revision: 16px outer padding, saved profile aligned left; settings rail widened to 400px. Hide the embedded vertical scrollbar while retaining wheel/touch scrolling. Hide the profile gear button whenever the settings column is present; smaller screens retain it.

- Profile fills its full available desktop column instead of stopping at 1120px. Header/banner uses the same left/right edges; column and template widths are measured independently. Main profile top margin -13px halves the visible 26px gap to the web header, without moving/resizing the settings column.

- Account verification overview hides the redundant bottom Close button and vertical scrollbar; top-right close and verification submission actions remain. Header navigation receives 24px left padding without moving brand/account actions.
