# Unified project invitations

Members panel: replace the two owner actions with one “Lời mời” action aligned
right on the same row as the panel title. Preserve owner-only access.
Requests modal: one combined list of applications and sent invitations, with
per-row type labels, existing status and decision actions. Remove the two tabs.
Move the existing invite-member entry inside the modal; returning from invite
reloads the list. Preserve existing API contracts, busy guards and permissions.

Plan: browser regression for one header action and mixed list; shared HubPanel
header action; unified modal and invite navigation; verify desktop/mobile header
alignment, decisions, invite return/refresh and owner gating.
Commands: `node tests/project-links-browser-check.cjs`,
`node node_modules/typescript/bin/tsc --noEmit`. No backend/dependency changes.
