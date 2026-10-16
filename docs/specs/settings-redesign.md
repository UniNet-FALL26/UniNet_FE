# Settings redesign

## Objective
Redesign settings using the existing UniNet blue/navy tokens, native controls and responsive layouts. Preserve portfolio saving/retry and offline local logout.

## Acceptance
- Account summary with real name/email and role; two-column at tablet/desktop and stacked at phone widths.
- Profile rows: “Hiển thị mẫu hồ sơ” toggle and choose template; only for students. No edit row or redundant display status.
- Keep the header breadcrumb; remove the duplicate page title/tagline beneath it.
- Account/security: account details dialog and local logout. Password change visibly unavailable until a backend API exists. No logout-all button.
- Terms of service and privacy buttons open explicitly unavailable-content notices, matching registration. Official policy text has not been supplied.
- Account actions remain available when profile requests fail.
- Controls have names, pressed/disabled states and 48px touch targets. No horizontal overflow at 320px, 768px and 1440px.

## Plan and verification
1. Add logout-all service tests for 204 success, server failure and account-switch races.
2. Restyle settings and add real account/security actions and modal confirmation.
3. Browser check responsive success/error states, display toggle, account/policy dialogs and local logout.
- Test: `node -e "require('./tests/refresh-token.test.cjs')"`
- Types: `node_modules/.bin/tsc --noEmit`
- Web: `node_modules/.bin/expo start --web --port 8083`
- Sources: settings screen, auth service and hook. Tests under `tests/`; handoff under `docs/handoffs/`.

## Style and boundaries
Use existing StyleSheet tokens and SymbolView, e.g. `color: colors.navy`. No new libraries or backend changes, fake working password controls, credential display or account deletion.
