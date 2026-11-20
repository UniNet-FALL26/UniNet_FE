# Popup outside dismissal

- Transparent React Native popups expose an absolute-fill `Pressable` as the first child of their overlay, behind the dialog. Outside taps call the same callback as `onRequestClose`; dialog controls and empty space inside the dialog do not trigger it.
- Added missing backdrops to 31 popups, including the shared `HubModal` used by messaging/project dialogs and standalone profile, company, community, settings, and wallet forms.
- Existing dismissal callbacks retain their busy-state and unsaved-work behavior. Added missing `onRequestClose` handlers to community post delete/report and comment delete confirmations. Full-screen detail routes have no outside area.
- Checks: `node scripts/test-modal-outside-dismiss.cjs`, `node scripts/test-chat-modal-controls.cjs`, `node scripts/test-community-comment-input.cjs`.
- Full typecheck currently reports existing unrelated type/style errors in opportunities and assessor posts. Chrome DevTools verification is blocked by an existing browser-profile session conflict.
