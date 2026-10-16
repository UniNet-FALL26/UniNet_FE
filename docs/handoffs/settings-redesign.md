# Settings redesign and account security

- `src/app/settings.tsx` keeps existing profile read/save/retry behavior; uses UniNet tokens, grouped icon rows, account identity summary and a 900px breakpoint for two columns.
- Student actions: “Hiển thị mẫu hồ sơ” toggle and template selection. The duplicate page title/tagline, display status line and settings editor shortcut were removed per user request. Account actions remain available for all roles and on portfolio load failures.
- Account details use current auth account only. Password change is disabled with an explicit “Sắp có” label; no backend endpoint exists. Partners can open the existing verification route.
- Logout-all button and confirmation removed per user request. Existing internal service remains; settings does not invoke it.
- Terms of service and privacy buttons open clearly labeled unavailable-content dialogs. Registration has the same unavailable policy content; no official text or policy URLs exist in the repository.
- Local logout remains offline-capable and resets the account screen tree.
- Verified: TypeScript, responsive settings at 320/768/1440, account/policy dialogs, display PUT and local logout. Existing Node regression tests retained. Screenshots in ignored `dist/settings-verification/`.
- No dependencies or backend changes. New password-change API is still needed before enabling that row.
