# Persistent detail navigation

## Implementation

- Root Stack uses a stable `screenLayout` to wrap standalone authenticated screens in the account's existing shell. The Stack stays mounted, preserving back history and removal guards. Existing role groups retain their own shells.
- Student/assessor shells accept children; partner layout now delegates to `CompanyShell`. All shells render `DetailNavigationFrame` above scrolling content, retaining desktop headers/mobile footers.
- `detail-navigation.ts` describes ordered parent breadcrumbs and direct-link fallbacks. Verification IDs are not used as project IDs; loaded project metadata supplies the project link.
- `DetailNavigation` registers existing back handlers, disabled state and page actions in the shell. Profile editor and job editor preserve unsaved-change confirmation for parent navigation.
- Full-screen recruitment, public company and submitted CV modals use `DetailModal`, including the account shell and independent safe-area provider. Global navigation dismisses the detail view; nested student detail screens dismiss the whole chain.
- Migrated profile, settings, wallet, workspace, project creation/detail/import, verification and assessor/company secondary headers. Main tabs, form dialogs and confirmation dialogs keep their existing behavior.

## Verification

- Browser fixtures verified 32 secondary routes at 375/1440, including loading/error states, back positioning, breadcrumbs, retained footers and existing job actions.
- Additional checks passed for 768/1024, real preview → editor navigation, unsaved-change back/parent guards, main-tab navigation and public-company modal dismissal.
- Existing partner navigation regression passed; route metadata and assessor navigation unit tests passed.
- Screenshots: `dist/persistent-navigation/` and `dist/partner-public-profile/` (ignored artifacts).
- Full TypeScript check still reports the pre-existing opportunities icon/missing-style errors and assessor CommentModal prop error. No new errors in the changed navigation code.
- Existing `profile-editor-browser-check.cjs` stops at the stale `Mẫu hồ sơ` entry label (current UI uses `Đổi mẫu hồ sơ`); focused editor navigation/guard checks above pass.
- Browser tests use mocked API responses. Native safe-area behavior is implemented through existing providers; no device runtime was available.

## Follow-up context

Prior uncommitted partner profile/date changes remain in the same FE worktree. Backend was already committed separately as `22d64c0`; this task changes FE only.
