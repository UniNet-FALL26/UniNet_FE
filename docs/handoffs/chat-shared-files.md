# Chat shared files

- `SharedChatFiles` supplies the same gallery for direct and group chat settings.
- Desktop: category sidebar, media thumbnail grids, document rows, selection and downloads. Small screens use category tabs above the content.
- Keep the single back control through `HubModal.dismissControl="back"`.
- `ChatDocumentIcon` and `documentPresentation` recognize document extensions/MIME types across draft attachments, sent messages and the gallery. Unknown formats use the generic file symbol.
- `ChatMediaThumbnail` uses the shared protected-file loader: object URLs on web and private local cache files on native. Requests abort and preview resources are removed on unmount. See `chat-native-file-access.md`.
- `downloadChatAttachment` centralizes the existing web download/native sharing behavior.
- The existing shared-files endpoint returns 30 items per page, without totals, timestamps or per-attachment deletion. Counts describe loaded items; load-more remains explicit.

## Verification

`node --test scripts/test-chat-attachments.cjs scripts/test-chat-modal-controls.cjs`

Browser gallery rendering was inspected with temporary fixture data. The fixture route was removed. Screenshot capture stalled, so final responsive visual verification remains outstanding. Existing Hooks lint errors remain in `ChatAttachment`, `ChatDetailsModal` and `ProjectHubUI`.
