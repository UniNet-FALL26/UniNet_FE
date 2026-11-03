# Partner navigation

## Behavior
- Partner navigation order: Cộng đồng, Nhắn tin, Tuyển dụng, Thông báo, Hồ sơ. Remove Quảng cáo and Tổng quan from navigation; dashboard remains reachable through the brand link.
- Desktop header shows community/messages/recruitment followed by existing notification/profile actions, without duplicate notification/profile links.
- Mobile footer always shows all five icons and text labels; match Student footer sizing, typography, active indicator and bottom safe-area padding. Notification entry reflects unread count and opens the existing Partner notification route.
- Add a Partner messages route reusing the existing Student messages screen inside the Partner layout. Current messages screen is an inbox placeholder; no chat backend is introduced.
- Quảng cáo is accessible from a Partner-only tool section in Settings (embedded in profile and standalone Settings), keeping the existing advertisement page and APIs.

## Plan and verification
1. Add a failing browser regression for order, labels/icons, Student-matching footer height, active states, role/layout retention, notification badges, desktop links and advertising through Settings.
2. Update CompanyTabBar, add the route alias and Partner Settings entry; preserve authentication guards and existing Student navigation.
3. Verify browser navigation at 320/390/768/1024/1440px, existing profile/header regressions, TypeScript, static web export and handoff. No dependencies, migrations or backend changes.
