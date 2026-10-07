# Mobile navigation handoff

- Authenticated screens render through `src/app/(tabs)/_layout.tsx` and the shared `src/components/app-tabs.shared.tsx` shell on Android, iOS, and web.
- The footer has four route tabs and a central Menu button. The Menu opens an animated shortcut sheet above the footer; it does not navigate to a Menu route.
- Footer routes: community index, messages, notifications, profile. Menu routes: workspace, opportunities, learning, events, groups, documents, skills, more.
- All destination routes currently show `ModulePage` with their real name and a clear empty state. Connect each route to its feature data when available.
- Unread counts are not yet supplied by an API. `badgeLabel` already hides zero and caps values at `99+`; connect counts to the two relevant tab items when messaging and notification data exist.
- Verify with `npx tsc --noEmit`, Android release build, then tap every destination after logging in on device.
