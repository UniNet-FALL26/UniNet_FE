# Responsive chat settings pages

- Below 800px, conversation/group details open `/chat/[id]/settings`; chat notification preferences open `/chat/notifications`. Desktop entry points retain their existing popups.
- Settings query params (`section`, optional `memberId`) push separate route instances for name, members, add members, roles, mute, project linking, shared files and friendship actions. Back uses route history, with a role-aware conversation fallback for direct links.
- `ChatDetailsModal` accepts optional controlled section navigation. Desktop callers still use its original local state. Direct section links cannot expose group admin tools to regular members.
- `HubPagePresentation` scopes shared `HubModal` instances to normal page headers/content/footers. It is enabled only by chat settings routes below 800px; default popup rendering and outside dismissal remain unchanged elsewhere. Nested file previews and friendship confirmations inherit the page presentation.
- Settings reload the authorized conversation on focus, retry and chat revisions, and after successful mutations. All three account shells keep the messages tab active on `/chat/` routes.
- Verification: 11 chat settings checks, 3 modal controls checks, 21 attachment checks and 1 popup dismissal audit pass. New route/loader files pass lint. Full typecheck retains 13 pre-existing errors in opportunities and assessor posts, with no additional errors.
- Device visual navigation was not verified because the connected phone was in an unrelated profile editor. No messages or settings mutations were sent during testing.
