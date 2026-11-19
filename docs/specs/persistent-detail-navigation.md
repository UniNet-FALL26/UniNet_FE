# Persistent navigation for secondary pages

## Objective

Authenticated secondary/detail pages retain the role's desktop header or mobile footer. A back arrow is always on the left; desktop shows clickable parent breadcrumbs followed by the current page. Mobile shows a compact top bar. Only existing page actions may appear on the right. Main tabs and authentication pages retain their navigation.

## Architecture and tasks

1. Reuse student, partner and assessor shells with optional children; wrap standalone authenticated routes in their account shell without nesting shells on tab routes.
2. Centralize route ancestry and a responsive detail toolbar. Pages with existing back guards/actions use that toolbar; routes without a toolbar get a fallback from their shell, including loading/error states.
3. Wrap full-screen detail modals (recruitment, public company, submitted CV) in the same role shell. Keep editor/confirmation dialogs as dialogs.
4. Migrate existing secondary headers in profile, project, verification, workspace, settings, wallet and role detail routes. Preserve existing handlers, unsaved-change guards and authorization.
5. Verify route mapping with Node tests and representative desktop/mobile flows in a browser. Record handoff.

## Conventions and boundaries

- Expo Router + React Native, existing color tokens and 1024px navigation breakpoint.
- `DetailNavigation` takes existing `onBack` and actions as children/props; do not invent edit/delete/save actions.
- Source: `src/components/navigation`, route metadata: `src/utils/detail-navigation.ts`; tests: `tests`.
- No backend, dependencies or unrelated redesign. Existing uncommitted partner profile work must be preserved.

## Commands and acceptance

- `node tests/detail-navigation.test.cjs`: main tabs excluded, all secondary routes resolve ordered breadcrumbs and safe direct-link fallback.
- `node tests/persistent-navigation-browser-check.cjs`: one desktop header, one mobile footer, left back arrow, ordered ancestry, role-correct navigation and unchanged action sets.
- `npx tsc --noEmit`: compare against existing opportunities/assessor errors; introduce no new errors.
- Browser screenshots at 375/1440 plus boundary checks at 768/1024. Back, parent links and footer navigation work; content scrolls within the shell.
