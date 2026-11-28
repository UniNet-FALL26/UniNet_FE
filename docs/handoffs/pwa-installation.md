# UniNet PWA installation

## Behavior
- Web has a compact **Cài UniNet** action on Welcome. Settings has a full-width
  outlined button below the policy rows and before logout, per user preference.
- Chromium uses a retained `beforeinstallprompt` only after a user click. Each
  event is consumed once; cancellation does not report success. `appinstalled`
  and standalone display mode hide the action.
- iPhone/iPad show Safari Share > Add to Home Screen instructions. Other
  browsers without an install event get browser-menu guidance. Dialog supports
  Escape and background dismissal. Android/iOS native builds render no PWA UI.
- `+html.tsx` provides the manifest, Vietnamese locale and Apple metadata. Icons
  are 192/512px plus an Apple 180px icon, resized from the existing app artwork
  with the already-installed Expo image utilities; no new dependencies.
- Root `/pwa-sw.js` stores **only `/offline.html`**. Successful navigations,
  API requests, auth credentials, profiles and messages are never cached.
  Network failures show the reconnect page; normal app features need connectivity.
- Firebase's existing `/firebase-messaging-sw.js` and separate registration scope
  are untouched. Cache cleanup removes only this worker's old versioned caches.

## Build and hosting
```powershell
npx expo export --platform web --output-dir dist --max-workers 2
```
Deploy the complete output directory at the domain root over HTTPS. Localhost is
allowed for development/testing; plain HTTP on a LAN address is not sufficient.
Serve `/manifest.webmanifest`, `/pwa-sw.js`, `/offline.html` and `/pwa/*.png` as
actual static files, not SPA fallback HTML. Use `application/manifest+json` for
the manifest, JavaScript for the worker and `Cache-Control: no-cache` for worker
updates. The worker is registered only in production exports, not Expo dev mode.

No automatic reload or forced worker activation is used. Updated workers can
activate when older app windows close. Bump the `uninet-pwa-offline-v1` cache
version when changing the offline page so installed users receive its new copy.
No hosting deployment or Git commit is included in this task.

## Verification
- `node tests/pwa-installation.test.cjs`: 9 cases cover event consumption,
  cancellation, appinstalled, standalone/iOS/insecure states, cache privacy and
  cleanup, manifest identity and real PNG dimensions.
- `node tests/pwa-installation-browser-check.cjs`: real Chrome verifies manifest,
  installability (including a non-incognito profile), root/Firebase worker
  coexistence, 375/1440px layout, offline fallback and cache contents, mocked
  accept/dismiss states, standalone hiding, iPhone guidance and Settings placement.
  UI installation events are fixtures; OS installation and Safari were not automated.
- Export for browser tests: `npx expo export --platform web --output-dir .expo/pwa-check --max-workers 2`.
- Web and Android JavaScript exports succeeded. PWA files have no new type errors;
  `tsc --noEmit` still reports existing errors in `opportunities.tsx` and
  `AssessorProfilePosts.tsx`.
- New PWA files, root/Welcome integration and worker pass focused ESLint.
  Settings retains the same 3 existing lint errors as HEAD (verified by comparison).
- Combined PWA/auth regression run: 26 passed; 3 existing company route-guard
  tests fail because their VM loader lacks `@/components/navigation/CompanyShell`.
  Those tests and the company layout are unchanged.
- Artifacts/screenshots live under ignored `.expo/pwa-*` paths. Real mobile
  installation remains a manual check against the deployed HTTPS domain.

## Sources
- https://docs.expo.dev/guides/progressive-web-apps/
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt
