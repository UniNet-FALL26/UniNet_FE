# Community comment actions

- Comment/reply bubbles on all screen sizes open a centered action menu on long press. Own comments offer reply/edit/delete; other comments offer reply/report. All screen sizes use long press; no ellipsis button is shown.
- Menu actions use `expo-symbols` icons. Reporting requires a selected reason; submission disables controls, preserves failures for retry, and closes on success.
- Backend currently supports only post-based `ContentReport` records. `communityService.reportComment` sends to the existing post report endpoint with comment ID, author, content, and selected reason in `Reason`. This identifies the comment for reviewers without adding an unsupported endpoint. Reports remain classified as post reports in the moderation queue; there is no dedicated comment target or removal action.
- Comment and reply success toasts are disabled. Native submission dismisses the keyboard after success; the modal's outer `KeyboardAvoidingView` handles keyboard space. Input and placeholder colors are explicit for dark device themes.
- Verification: `node scripts/test-community-comment-input.cjs` (9 checks). `CommentModal.tsx` retains an existing `react-hooks/set-state-in-effect` lint error in its post reset effect.
