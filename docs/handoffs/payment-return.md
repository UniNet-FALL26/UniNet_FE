# Payment return and session restoration

Checkout reads backend state every 12 seconds while pending, pauses when hidden,
stops after success/review or three read failures, and refreshes on foreground or
browser dismissal. No polling operation creates a payment. Return query flags
never mark a transaction paid. A review state only claims money was received if
backend status is successful.

## Backend configuration required

Configure both PayOS ReturnUrl and CancelUrl to the deployed frontend:

`https://<frontend-domain>/payment/result`

For local development on the same computer running Expo web, use
`http://localhost:8081/payment/result` for both URLs. Log in once after updating
the frontend so the session can be saved. localhost on a phone refers to that
phone, so use the original computer browser tab for this local return test.
No HTTPS app-origin environment variable is needed until a domain is available.

For reliable cross-device/multiple-tab returns, backend should append its trusted
verification identifier when creating the PayOS payment link:

`https://<frontend-domain>/payment/result?verificationId=<verification-id>`

Do not append the frontend route parameter `id`: PayOS also returns its own `id`.
Without verificationId, the result route recalls the most recent transaction on
this device, scoped to the signed-in account and limited to 24 hours. Backend
authorization still controls all reads. Context is saved after creation and when
resuming an existing checkout. No credential is included in return/app URLs.

Deploy this route before changing backend URLs. Existing PayOS links may retain
their original return URLs. Backend webhook verification, booking confirmation,
idempotency and reconciliation remain required; frontend cannot repair an unpaid
backend record. This frontend repository contains no backend configuration/code.

## Sessions

Native credentials are stored as a rotating pair in expo-secure-store. Only tokens
and expiry are persisted; /auth/me validates identity before protected content.
Web uses sessionStorage to survive reloads and same-tab provider redirects, with
in-memory fallback when browser storage is blocked. A separate tab/browser/device
may require login; the result route preserves the destination through login.
Persistent login across all web tabs requires backend Secure/HttpOnly cookies and
CSRF/session endpoints, which this repository does not provide. Browser-readable
sessionStorage remains susceptible to XSS, so do not log its contents.

## Native return links

`uninet:///payment/result?verificationId=<id>` is supported by the existing scheme.
The web result page has a user-triggered “Quay lại ứng dụng” button. Use a native
development/production build for this scheme (not an Expo Go URL).

Set `EXPO_PUBLIC_APP_ORIGIN=https://<frontend-domain>` before rebuilding native
apps. app.config.js adds iOS associatedDomains and Android verified VIEW intents
for /payment/result. Actual HTTPS verification additionally requires:

- Android: serve `/.well-known/assetlinks.json` on that domain with package
  `com.uninet.mobile` and the release signing certificate SHA-256 fingerprint.
- iOS: configure the real bundleIdentifier and serve
  `/.well-known/apple-app-site-association` with Apple Team ID + bundleIdentifier,
  allowing `/payment/result` paths.
- Serve association files as JSON over HTTPS without redirects; deploy/rebuild
  and test with the actual release identity and domain.

Domain, Apple Team ID/bundle ID, certificate fingerprint and hosting access are
not present here; verified links cannot be activated just by frontend code.

References: https://docs.expo.dev/linking/android-app-links/ and
https://docs.expo.dev/linking/ios-universal-links/.

## Manual integration checks

1. Reload authenticated checkout: restore /auth/me, retain the same pending transaction.
2. Pay once on another device while checkout is visible: GET refresh updates within
   about 12 seconds after backend confirmation; no new POST; QR/actions disappear.
3. Pending provider return and forged `status=PAID`: continue showing backend pending.
4. Successful/review response: stop polling; review message does not request payment.
5. Provider cancel/browser dismissal: refresh backend without declaring cancellation.
6. Expired session: login from result route returns to the same verification.
7. Device app link and web fallback button: open the result route and verify with backend.

Live bank payments, webhook delivery and verified domain linking need environment testing.
