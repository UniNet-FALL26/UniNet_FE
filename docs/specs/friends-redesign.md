# Friends redesign

## Objective and acceptance
Match the supplied light blue reference using existing UniNet styles. Exactly two inner tabs: Bạn bè and Lời mời kết bạn (received only). Rows show avatar, name and mutual friend count. Friends expose removal through an ellipsis popup; received requests expose Xác nhận (accept) and Xóa (reject). Preserve profile navigation, search, pagination, loading, empty and error states.

## Contract and boundaries
Add integer `mutualFriendsCount` to FriendPerson, computed from distinct active student accounts accepted by both viewer and target, excluding both endpoints. Self has zero. Preserve existing routes, request versions, role checks and other consumers. No schema changes or new dependencies.

## Structure and style
Expo/React Native components in src/components/friends, contracts in src/types/friendship.ts; EF Core service in UniNet_BE/UniNet.Application/Services. Keep existing service/action patterns: `friendshipService.decide(person, 'reject')`. Use existing HubAction, HubModal, PersonAvatar and blue palette.

## Ordered tasks and verification
1. Add mutual-count regression tests, then implement DTO/projection and frontend type. Verify: `dotnet test UniNet.Tests/UniNet.Tests.csproj --filter FullyQualifiedName~FriendshipTests` from UniNet_BE.
2. Rework panel and list-specific actions; retain default profile actions. Verify: `npx tsc --noEmit` and `node tests/friendship-service.test.cjs` from UniNet_FE.
3. Update browser regression fixture for two tabs, menu keyboard/dismissal, accept/reject/removal and mobile overflow; run `node tests/friendships-browser-check.cjs` with local Expo web server (`npx expo start --web --port 8084`). Review diff and document handoff.

## Testing and risks
SQLite service tests exercise both friendship directions, nonaccepted states, inactive/nonstudent mutuals and mutation responses. Browser checks use mocked API fixtures; real backend integration is covered separately. Always preserve unrelated code and authorization. No deployment or migration required.

## Banner reference correction (2026-11-18)
Replace the campus photo with a dedicated pale blue illustrated banner: three
students with chat bubbles/campus silhouettes at right, exact live copy at left:
"Kết nối với bạn bè trên UniNet" and "Tìm kiếm, kết bạn và mở rộng mạng lưới học tập,
dự án và cơ hội nghề nghiệp." No "Tìm bạn bè" button, per latest user request.
Retain exactly two main tabs. Below 600px hide the whole banner and show only
the two tabs. Cap search width at 200px and input height at 36px.
On desktop both tabs overlay the bottom of the banner;
remove the separate white tab strip. Verify button absence, responsive
screenshots and unchanged friends actions in the browser fixture.
