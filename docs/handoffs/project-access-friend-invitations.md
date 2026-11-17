# Project access and friend invitations

- Privacy panel removed. Detail is readable through the existing authenticated project route; edit and membership permissions remain enforced by backend.
- Members tab always visible. Owner opens Lời mời → Mời thành viên. Picker searches only eligible friends, selects one, and requires only a position name. No message or recruitment form. Existing projectId candidate filter excludes members/pending invitations.
- Send uses requestType=1, invitedUserId=profile ID and role. Success reopens unified list with name/role/status; errors retain selection. No recruitment required for direct invitations. Applications retain active/open/nonexpired recruitment checks.
- ProjectReceivedInvitation uses participant-scoped requests/mine?projectId; recipient can accept/reject on detail. Backend alone creates membership and saves Role/JoinRequestId on acceptance.
- ProjectSettingsPanel retains management actions. Recruitment management stays in header, independent of whether friends already joined.
- Validation: friendships browser suite (including recipient accept/reject), links/members browser suite, cards/profile suite at four widths, client API tests, production web export. Typecheck has existing errors in opportunities.tsx and AssessorProfilePosts.tsx; no errors in changed project components.
- All Completed projects remain eligible for friend invitations. Shared canInviteProjectFriends helper drives owner button, picker and recipient card. Rejected projects remain blocked; completion fields are not changed by acceptance. Classification was removed; see remove-project-classification.md.
