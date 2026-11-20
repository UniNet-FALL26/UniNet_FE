# Chat settings on small screens

## Objective and acceptance
- Below 800px, conversation/group settings open as a normal routed page, not a native Modal.
- Child settings (members, add members, roles, name, project links, mute, shared files and friendship actions) use the same page layout and route history.
- Header and system/browser back return to the previous settings section or conversation. Direct links have a role-aware messages fallback.
- Chat notification preferences also use a dedicated page on mobile.
- At 800px and above, the existing messaging entry still opens popups.
- Reuse settings actions, permissions, validation and services. Do not change API contracts.

## Implementation plan
1. Add an inherited page presentation for HubModal, retaining default modal behavior.
2. Allow ChatDetailsModal sections to be controlled by route params while preserving its current local state on desktop.
3. Add a settings route which loads the current conversation and refreshes it after edits; use the existing account shell.
4. Route mobile settings entry to this page; keep desktop entry unchanged.
5. Verify page/modal rendering, section navigation, permissions and existing messaging checks.

## Structure and conventions
- Shared presentation: `src/components/projects/hub/ProjectHubUI.tsx`.
- Settings and loader: `src/components/messaging/`.
- Route: `src/app/chat/[id]/settings.tsx`.
- Preserve existing TypeScript/React Native patterns and styling.

## Validation commands
- `node scripts/test-chat-settings-pages.cjs`
- `node scripts/test-chat-modal-controls.cjs`
- `node scripts/test-chat-attachments.cjs`
- `npx tsc --noEmit --pretty false`

## Boundaries
- No new dependencies, database changes or messages sent during verification.
- Existing mutations and permission checks remain in their current services.
