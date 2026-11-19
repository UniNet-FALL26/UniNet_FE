# Notification inbox UI — 2026-11-06

- Applied supplied reference to NotificationsPanel/NotificationRow: All/Unread/Read tabs, real total/unread counts, right-aligned mark-all, light-blue unread cards, white read cards, rounded-square colored icons, time below text, dot/check status, Today/Earlier groups.
- Entire row is pressable, including its status icon. Mobile keeps all three tabs and an accessible mark-all icon in one row. Hover fills the entire row.
- `NotificationFilter.readOnly` forwards the server filter before pagination. Requires matching backend update. Provider uses pageSize=1 list response for global total/unread count rather than deriving counts from loaded rows.
- Optimistic read state/count, background PATCH, navigation, rollback/error and silent success remain as documented in optimistic-notification-read.md.
- Verified: six hook tests, six utility tests, Student/Partner Chrome suite; 320/375/768/1440px and landscape screenshots, tab filtering/counts, load more, realtime/reconnect and account isolation. Inspected screenshots; artifacts under ignored dist/notifications.
- Full FE type check has pre-existing failures in opportunities.tsx and AssessorProfilePosts.tsx; notification components introduce no reported errors. No native-device validation.
