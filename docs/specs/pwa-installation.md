# Install UniNet as a PWA

## Objective and success criteria
- Users can install the deployed UniNet web app from a supported browser and
  launch it from the home screen in standalone mode with UniNet name/icon.
- Add a discreet "Cài UniNet" action on Welcome and Settings for web users.
- Settings uses a full-width outlined button below the policy rows, before logout;
  Welcome keeps a compact action (user-requested placement).
- Chrome/Edge: use the saved `beforeinstallprompt` event after user interaction.
  iPhone/iPad: show Share > Add to Home Screen instructions. Other unsupported
  states show honest browser instructions; never claim installation succeeded.
- Hide the action when running in standalone mode; allow retry after dismissal
  only when the browser provides a fresh install event.
- Offline navigation shows a small Vietnamese reconnect page. Authenticated
  pages, API data, credentials and messages are never added to the PWA cache.
- Firebase push retains its existing worker and separate registration scope.

## Stack, structure and style
- Existing Expo Router static export, React Native Web and TypeScript.
- No new npm dependency, no backend/schema changes, existing UniNet artwork.
- `public/`: manifest, 192/512px icons, Apple touch icon, worker and offline page.
- `src/app/+html.tsx`: manifest/mobile metadata using Expo Router HTML support.
- Web install state in a small typed store/hook with a native no-op counterpart;
  platform-specific install component reused by Welcome and Settings.
- Register the root worker once on the web; preserve the Firebase push scope.
- Follow named exports and current color/Button components. Example contract:
  `requestInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'>`.

## Ordered plan and verification checkpoints
1. Write behavioral tests for install eligibility, dismissal, standalone mode
   and worker cache boundaries. Add manifest/metadata/icons and safe worker.
   Verify asset dimensions and manifest fields; inspect exported HTML links.
2. Implement install event handling and web UI; use a native no-op component.
   Verify event handling tests, focused lint and TypeScript diagnostics.
3. Export web and check real Chrome manifest/worker registration, install UI,
   standalone state and offline fallback on mobile/desktop. Record results and
   deployment requirements in `docs/handoffs/pwa-installation.md`.

## Commands
- `node tests/pwa-installation.test.cjs`
- `npx eslint <changed TypeScript/JavaScript files>`
- `npx tsc --noEmit` (report existing unrelated failures separately)
- `npx expo export --platform web --output-dir .expo/pwa-check --max-workers 2`
- `node tests/pwa-installation-browser-check.cjs`

## Boundaries and operational requirements
- Always: HTTPS in deployment (localhost permitted for testing), same-origin
  worker/manifest/assets, accessible labels and no automatic permission prompts.
- Only clean this worker's versioned cache; never unregister unrelated workers.
- Never: cache private API/auth responses, force-install, request notification
  permission during installation, deploy or commit without user instruction.
- Actual installation UI depends on browser support and eligibility. Mocked
  install-event tests do not prove native browser/app installation occurred.
- Approved: user selected PWA and explicitly requested implementation.

## Official references
- https://docs.expo.dev/guides/progressive-web-apps/
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt
