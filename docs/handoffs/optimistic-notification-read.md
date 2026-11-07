# Optimistic notification reads — 2026-11-06

- Session-scoped `NotificationsProvider` owns read overrides, in-flight IDs, optimistic unread count, PATCH and rollback. `useNotificationsInbox` projects overrides and applies unread-only filtering; read operations persist when the originating screen is no longer active.
- Embedded safe target URLs open immediately; target-type lookups run independently of read PATCH. No destination means mark read only. Existing target allowlist remains enforced; destination screens perform their own data authorization.
- Read errors use existing global ToastHost and restore unread state/count. Successful read/read-all requests suppress automatic API success feedback (`feedback: false`). Target lookup also disables automatic feedback so missing/forbidden targets remain silent. No success toast is emitted for clicking notifications.
- Unread-count responses are guarded by session identity, pending reads and mutation version. Read-all clears overrides after successful API completion.
- Verification: six focused hook tests, six notification utility tests and Student/Partner Chrome integration passed. Browser tests hold/fail PATCH, check instant badge/row changes, no success toast, rollback, and errors after navigating to settings; then cover retry, realtime/reconnect, responsive layout, pagination and account replacement.
- Browser clock now advances from the fixture date rather than freezing Date.now, allowing ToastHost animations to complete.
- Full FE TypeScript check still reports existing errors outside notifications in `src/app/(tabs)/opportunities.tsx` and `src/components/assessor/AssessorProfilePosts.tsx`. Native-device validation was not performed. Dashboard production build and matching Chrome fixture pass.
