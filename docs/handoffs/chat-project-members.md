# Add project participants to a linked chat

- Project acceptance and chat membership remain separate. A chat owner/admin manually adds an approved project participant.
- `AddChatMembers` defaults to project participants when a chat has a linked project; friend selection remains a separate tab.
- The project roster loads on opening the modal. Active participants already present in chat are excluded; former chat participants can be selected again.
- Selection is deduplicated by profile ID across both sources. Submission uses `messagingService.addMembers(conversation.id, [], profileIds)`.
- Project roster errors are visible and retryable. Saving preserves the existing backend permission, block and capacity checks.
- The component key includes conversation/project IDs so linking a different project resets stale selections.

## Verification

- Frontend: `node --test scripts/test-chat-attachments.cjs`.
- Backend: `dotnet test UniNet.Tests/UniNet.Tests.csproj --filter FullyQualifiedName~MessagingTests -m:1 -nr:false`.
- Backend coverage exercises approval followed by manual addition, existing-group linking, lack of friendship, pending-request rejection, non-admin rejection and duplicate submission.
- The backend implementation already supports this workflow; backend changes add regression coverage only.
