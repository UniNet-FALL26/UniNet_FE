# Messaging client

Status: Web realtime/private files and physical Android foreground/background/process-terminated FCM verified against a local API/PostgreSQL fixture. Android APK with Firebase and UniNet notification logo built and installed. iOS and real Web FCM delivery remain unverified. No deployment or shared database mutation was performed in this follow-up; production deployment remains pending.

## Changed client areas

- `src/types/messaging.ts`, `src/services/messaging.service.ts`: shared API contract, multipart attachments, protected downloads.
- `src/components/messaging/`: responsive inbox/thread, composer, attachment video/image/document viewer, actions/reactions, people picker/group creation, group/member/project controls, notification settings/popup/provider, project chat settings.
- `src/messaging/`: persistent device ID/preferences, canonical push parsing/deep links, Web/native Firebase registration, background entry.
- `public/firebase-messaging-sw.js`: real Web Push, MessageId dedup in IndexedDB, canonical notification clicks.
- `index.js`, `firebase.json`, `app.config.js`, `plugins/with-chat-notifications.js`, dependencies/lock: native background registration before Router, conditional Firebase config, Android channel and monochrome vector icon, deterministic manifest overrides. Register the local plugin first: manifest mods execute in reverse registration order.
- `src/app/_layout.tsx`, all three role message routes/shell badges; friend profile message actions; project settings. Login supplies DeviceId; logout unregisters/deletes device token and clears only its own session generation.
- `.gitignore` excludes native Firebase configuration and admin credentials; `.env.messaging.example` lists public client variables.

## Behavior

- Previewing a profile starts no room. First actual send creates/reuses a private room; friend/stranger classification follows current friendship state.
- Stable history cursors, older pages, replies, copy/edit/recall, six reactions, six attachments/50 MB total (per-type server limits still apply). Retries retain ClientMessageId and protect against duplicate sends.
- Desktop two panes; narrow view list or active conversation. Counts and receipts follow persisted server reads. Group/project memberships remain independent.
- SignalR handles cross-device messages, sender's other sessions, changes, typing, read status and membership removal. Reconnect/focus syncs current API data and loaded history range; no message polling. Only presence heartbeats run periodically.
- Foreground popup for incoming messages outside viewed room, not own/muted/blocked/read/duplicate messages. Foreground acknowledgement is per device; read position is global. Popups open the authorized room; pending targets survive login.
- Firebase permission is requested only from the explicit notification button. Device preference controls previews/opt-out; existing permission allows silent token renewal on startup/focus. No credentials produces a truthful unavailable state, never simulated notifications.

## Configure Firebase

1. Create a Firebase project. Register Android app **`com.uninet.mobile`**, download `google-services.json` to FE root (or set `GOOGLE_SERVICES_JSON` to its path). For iOS register the corresponding bundle ID and use `GoogleService-Info.plist`/`GOOGLE_SERVICES_PLIST`; add APNs credentials/capabilities in Firebase/Apple.
2. Register a Firebase Web app. Copy its public metadata and Cloud Messaging Web Push VAPID public key into `.env` using `.env.messaging.example`. Build/deploy the service worker at origin root over HTTPS (localhost is permitted for local testing). Deploy headers/CSP must allow Firebase worker scripts and FCM endpoints.
3. Backend: set **`Firebase__ServiceAccountPath`** to a private service-account JSON outside Git, or inject `Firebase__ServiceAccountJson` as a server secret. Enable FCM HTTP v1 and authorize that account. Never expose admin JSON through client environment variables.
4. Restart API; `/api/messaging/push/config` must return enabled. Rebuild/install the native app after adding Google config; Expo Go is unsupported for this integration. Open Tin nhắn → notification settings → Bật thông báo and grant OS/browser permission.
5. Run the platform matrix below with distinct accounts and Web+Android sessions. Opening a notification always checks current server permissions/data, including recalled messages.

Local native testing: use a Development build, Metro and API on localhost with ADB reverse for their ports. This session uses 8098/5169 and isolated fictitious accounts. Production `.env` API URL was not changed.

## Verification

- Real Chrome + local API/SignalR/PostgreSQL: preview without room, UI send, two sessions of recipient, popup in another room, exact-room navigation/read counts, typing, edit/reaction/recall, offline reconnect, group at 390px viewport, outsider 403, Firebase unavailable status.
- Real Cloudinary: two private file uploads/downloads, no storage key in response, unauthorized 401/non-member 403, unsigned Cloudinary URL denied, recalled file 410, cleanup destroys both remote test objects.
- `node --test tests/messaging-client.test.cjs`: canonical deep-link validation and notification config regression.
- Web export and Android Hermes export succeeded. Native APK built/installed; physical Android results are recorded below.
- Backend focused messaging/friendship/migration/concurrency cases pass. Expanded 53-case run: 50 pass, 3 existing partner-registration failures (personal name/empty name behavior); unrelated registration code was not changed.
- Full FE `tsc` retains existing errors in `(tabs)/opportunities.tsx` (icon typing/missing styles) and `AssessorProfilePosts.tsx` (CommentModal props). No messaging/module integration errors at the latest check.
- Static Web login reports 4 existing desktop hydration warnings in the multi-session script: `AuthLayout`/`DesktopAuthTransition` branch markup on viewport width during SSR. Script records these explicitly; messaging runtime errors remain a failure. No messaging browser errors were observed.
- Dependency audit found vulnerable gRPC through new Firebase packages; override `@grpc/grpc-js=1.13.6` removes Firebase/gRPC advisories. Remaining audit items predate this work (including baseline shell-quote 1.10.0); no blanket dependency upgrade was applied. Host Node22 emits engine warnings for latest transitive SDK packages; use the Node version required by installed SDKs in CI.

Repro scripts: `tests/messaging-browser-check.cjs` and explicit `UNINET_CHAT_CLOUD_TEST=1 node tests/messaging-files-check.cjs`. Fixture provisioner and API/event/table contracts are documented in BE `docs/handoffs/messaging.md`.

## Platform verification matrix

| Case | Web | Android | iOS |
| --- | --- | --- | --- |
| Foreground correct room / other room, SignalR | Chrome verified | Physical direct chat verified; popup includes logo | Not run |
| OS push while hidden/background | Real Web FCM not run | Physical FCM verified; UniNet icon visually checked | Needs Mac/APNs |
| Browser closed / app process terminated | Not run | Physical FCM after process kill verified | Not run |
| Web and phone simultaneously, per-device suppression | Backend deterministic checks pass | Full physical matrix not run | Not run |
| Mute/block/read on another device/logout/late push/rapid dedup | Backend deterministic checks pass | Real muted-room suppression verified; remaining combinations not run | Not run |
| Notification tap from terminated/logged-out state | Code wired; real push not run | Terminated + restored session verified; logged-out case not run | Not run |

Do not mark push foreground/background/terminated completion until these are verified with configured Firebase on the respective platform.

## Physical Android follow-up (2026-11-20)

- Device: Xiaomi 2602EPTC0G, Android API 36, USB ADB. Local API on 5169, Metro on 8098, PostgreSQL fixture on 55439; reverse mappings for API/Metro. Firebase service-account JSON stays outside Git. Public FE `.env` API URL was not overwritten.
- Verified with fictitious Alice/Bob accounts: other-screen popup with UniNet logo; direct history updates without popup while viewing the room; Android composer sends and persists a message; real OS FCM in background; no push for a muted room; real OS FCM after killing the debug app process via its own UID; tapping push cold-starts and restores the authorized conversation.
- Fixes: native AppState resume silently renews push registration and reflects revoked permission; Android channel omits `sound: 'default'` because Expo SDK 57 treats it as a missing custom sound file; keyboard avoidance measures the chat frame's actual window offset, since a nested safe-area provider can report zero and leave the composer under the IME.
- Branding: FCM explicitly requests `ic_uninet_notification`, with the same fallback in the Android manifest. Expo plugin generates a white U/paper-plane vector mask; Android applies system tint. Web Push always uses bundled app-logo assets. In-app popup has a separate UniNet logo/name beside conversation metadata.
- Tests: 41 focused BE cases (including isolated PostgreSQL migration/concurrency cases) passed; FCM payload/icon/privacy/size regression rerun after branding; 5 FE notification/resume/sound tests passed. Final Web export and 10 real-browser flows pass with no messaging runtime errors; 4 pre-existing desktop-login hydration warnings are recorded separately. TypeScript still has 13 existing errors limited to `(tabs)/opportunities.tsx` and `AssessorProfilePosts.tsx`; no messaging errors.
- Local artifacts: workspace `.tmp/messaging/physical-results.json`, `foreground-logo.png`, `device-notifications.json`, `backend-device-tests.log`, `logo-green-test.log`, `browser-final-device.log`. The local `device-check.cjs` helper records fictitious fixture-message checks and redacts text inputs in console summaries.
- Android **Force stop** differs from a process kill/swiping the app away: push remains blocked until the user opens the app again. A standalone release APK without Metro, iOS, real Web FCM, and the full logout/cross-device matrix were not tested. Tests here do not constitute production deployment.

References: [Firebase Web receive messages](https://firebase.google.com/docs/cloud-messaging/web/receive-messages), [RNFirebase messaging](https://rnfirebase.io/messaging/usage), [Android notification icons](https://developer.android.com/design/ui/mobile/guides/home-screen/notifications), [KeyboardAvoidingView](https://reactnative.dev/docs/keyboardavoidingview), [Expo config mods](https://docs.expo.dev/config-plugins/mods/), [gRPC patched advisory](https://github.com/advisories/GHSA-m9gg-hp2v-232j).
