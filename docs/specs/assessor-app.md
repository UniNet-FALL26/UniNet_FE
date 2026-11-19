# Assessor user app

## Confirmed requirements
Assessor (role2) uses UniNet_FE's existing login, lands in Community, and has five ordered destinations: Community, Messages, Assessment list, Notifications, Profile. Large web screens use a header; smaller web/native use a footer with icons and text matching the current user app. Assessor cannot sign in to the admin Dashboard. User explicitly confirmed all Assessor pages belong in FE.

## Implementation slices
1. Shared home-route policy and guarded Assessor route group; block both new/cached Assessor sessions and routes in Dashboard. Test role destinations and dashboard admission before implementation.
2. Fixed responsive shell using existing brand/colors/spacing; reuse community feed, messaging and notifications. Own Assessor profile reads /profile/me and embeds shared Settings with the correct role label.
3. Assessment list and owned details from existing /assignments/me and /assignments/{id}; status filtering/pagination and safe loading/error/empty states. Expert-specific work remains under this section, including availability and meeting/report actions supported by current APIs. No staff-management controls or fake assignments.
4. Update notification destinations for Assessor to FE routes and verify role ownership remains enforced by the existing backend. No role/schema changes.
5. Browser-check actual login, landing, five destinations, selected states, mobile safe area/fixed navigation, refresh/deep links, API failures and Dashboard denial. Typecheck/export/build relevant clients; focused backend tests if notification targets change. Record handoff.

## Constraints and validation
Preserve dirty changes already present. Reuse current Expo Router/React Native and Dashboard auth/session patterns; no dependencies, deployment, real financial actions or unsolicited role/account creation. Messages reuses the current user app inbox, which is not yet a backend chat implementation. Commands: FE `npx tsc --noEmit`, `npx expo export --platform web --output-dir dist/assessor-web`; Dashboard `npm run build`; focused node tests and isolated Playwright browser fixtures. Server determines assignment ownership and action eligibility; no client-only authorization.

Implementation is authorized by the user's detailed navigation request and explicit FE-only/Dashboard-denial correction. No additional approval needed for these reversible local changes.

## UI completion — 2026-11-01
User confirmed: complete the UI of all five Assessor pages only. Preserve current API calls, permissions, meeting/report behavior and backend. Keep the existing UniNet blue palette, typography and native/web stack; no additional dependencies or fabricated conversations, statistics or assignments.

Ordered tasks:
1. Community: add an Assessor page heading and desktop context rail while reusing the existing feed and composer. Verify feed and navigation remain usable at 320/768/1024/1440px.
2. Messages: replace the generic module placeholder with an inbox layout and honest empty conversation state; local inbox/invitation tabs only. Verify keyboard/touch controls and mobile layout; no message sending API.
3. Assessment list: improve information hierarchy, assignment rows, schedule/deadline presentation and filter/pagination styling. Preserve fetch/filter/detail behavior; verify loaded/empty/error states.
4. Notifications: contextual heading and desktop rail around the existing panel; preserve reading/filtering/target behavior. Profile: refine cover/identity, personal information and existing settings access with responsive spacing.
5. Verify typecheck, web export and isolated browser fixtures; capture five desktop/mobile pages, check navigation, overflow and console errors; document handoff.

## Community parity correction — 2026-11-01
User requested Assessor Community to match Student Community. Re-export the Student Community screen directly; remove the Assessor-only page heading, outer feed padding and context rail. Keep the Assessor shell/navigation and shared feed/composer behavior. Verify the existing responsive Assessor browser fixture, TypeScript and web export.

Header parity: align the desktop Assessor header with Student header styles and positioning. Keep Community/Messages/Assessments grouped beside the logo; place icon notification/profile actions with a divider at the right. Match header dimensions, compact breakpoint, type, hover/selected styles and profile chevron. Retain accessible labels, unread count, existing destinations and all five mobile footer tabs. Use the account avatar when present; no student portfolio API calls for Assessor.

Notifications parity: user requested the Student Notifications layout. Re-export `../(tabs)/notifications` directly, removing the Assessor-specific subtitle, outer spacing and desktop context rail. Keep shared filters, unread/read-all actions, list states and role-aware notification destinations. Verify responsive browser fixture, TypeScript and web export.

Desktop profile layout correction: preserve existing Assessor identity/information content. Match Student desktop columns at width >=1200: max-width 1800, 16px side insets, 24px gap, 8px top/20px bottom spacing; right embedded SettingsPanel width 400 with 20px rounded border. Align cover and settings at the top; hide the extra desktop page-heading strip. Keep mobile heading/settings access and existing data/API behavior. Verify geometry and overflow in the responsive browser fixture, TypeScript and web export.
