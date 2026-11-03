# Account notifications

## Contract
- `GET /api/notifications?page&pageSize&unreadOnly&category` returns `{ items, page, pageSize, total, unreadCount }`.
- `GET /api/notifications/unread-count` returns `{ count }`.
- `PATCH /api/notifications/{id}/read`, `PATCH /api/notifications/read-all` return 204.
- `GET /api/notifications/{id}/target` rechecks recipient, permission, resource access and returns `{ targetUrl }`. Missing/forbidden resources show an inline message; FE rejects paths outside its local business-route allowlist.
- SignalR `/hubs/notifications`, authenticated with the current account token; `NotificationChanged` is an invalidation event. API/database remain authoritative.

## UI and lifecycle
- Reference redesign: centered white inbox on a pale blue surface, compact category dropdown with server totals, local-calendar groups (today/yesterday/this week/earlier), relative time, unread dots and per-row read actions. Preserve direct page navigation, filters, pagination and account lifecycle. Icon names/tints/backgrounds must be centralized, with event-specific rules before category and unknown-type fallbacks.
- Student desktop bell navigates directly to `/notifications`; mobile footer shows the real unread count and opens the same page. No bell popup.
- Partner bell navigates directly to `/company-notifications`. Both roles use the full-page `NotificationsPanel` for all/unread/category filters, pagination and read actions.
- Root provider is keyed by account and auth-session generation. Logout/account changes stop the connection, abort old requests and unmount old data. Token rotation keeps the generation and uses the new token on reconnection.
- Reconnection, app activation, browser focus and a foreground fallback interval synchronize API state. Offline events remain retrievable from the database.
- Student opportunity notification targets support `tab=applications` and `jobId`; workspace task targets support `taskId` with a clear-focus action.
- The old `StudentVerificationNotifications` component remains available for compatibility, but the notifications page uses the unified API.

## Verification
- Pure tests: `node tests/notifications.test.cjs`.
- Browser integration with fixture API and real SignalR client: `node tests/notifications-browser-check.cjs`; optional `PROFILE_TEST_ORIGIN` changes localhost port.
- Type check: `node node_modules/typescript/bin/tsc --noEmit`.
- Web export: `node node_modules/expo/bin/cli export --platform web`.
- Browser artifacts are ignored under `dist/notifications/`.
- Verified: pure tests, full TypeScript check, Expo web export, and Chrome Student/Partner integration including direct bell-to-page navigation, absence of a popup, invalidation/reconnect, logout/account replacement and responsive 320/768/1440 widths. Browser API/hub fixtures test the client independently; backend integration is verified separately.
- Build prerequisite: replaced obsolete `StyleSheet.absoluteFillObject` with supported `StyleSheet.absoluteFill` in partner jobs confirmation overlay (same layout).
- October 25 recheck: notification pure tests, TypeScript and web export pass; Student/Partner Chrome fixture flows pass against Expo dev. Testing the static-export desktop `/login` separately reports React hydration error 418 before authentication; the viewport-dependent auth transition is a likely cause. Static-host browser validation remains open; the dev browser pass does not cover that failure.

## Runtime dependency
- Official `@microsoft/signalr` 8.0.17 client; reinstall from lockfile and restart Metro after adding the dependency (a running Metro file map can miss newly installed package files).

## Reference redesign / icon ownership
- `NotificationCategoryFilter.tsx` replaces the six-tab strip with an anchored dropdown. Category, unread-only and mark-all controls share the header row; on narrow screens the mark-all action uses an accessible icon. Selection closes the list; Escape/outside press dismiss it, focus returns to the trigger, and arrow keys move through choices. The menu scrolls within the viewport and closes on resize.
- `src/constants/notification-presentation.ts` owns event-to-visual mappings, category fallbacks, all notification glyph/color pairs and page tokens. `NotificationRow` uses this resolver; add a new event mapping there instead of branching inside a screen. Existing Expo Symbols are retained across web/iOS/Android; no icon dependency was added.
- Event visuals include likes, comments, mentions, replies, follows, verification, recruitment, projects and announcements. Unsupported types fall back to their category, then a neutral bell. Social fixtures demonstrate presentation; they do not add backend business events.
- The current DTO contains sender ID but no sender avatar/name metadata, so actual sender photos from the reference require a backend contract extension. No placeholder portraits are displayed as real users.
- Category badges use six bounded `pageSize=1` list requests per inbox invalidation, using server totals across all pages. The current API has no aggregated category-count endpoint. Failed count requests leave counts unavailable instead of inventing totals.
- Date groups follow the device's local calendar; read actions, safe navigation, unread filtering, load-more, realtime and account cleanup remain connected to the real API.
- Verification: six pure tests, full TypeScript check, web export and Student/Partner Chrome fixtures pass. Fixtures cover 9 visual examples, 31-row pagination/global totals, dropdown selection/dismissal, all three controls on one row at 320/375/768/1440px, per-row read actions, local date groups, reduced motion and 844×390 landscape. Browser tests are not native-device validation. Screenshots are generated under ignored `dist/notifications/`; `category-menu-role-*.png` captures the open filter.
