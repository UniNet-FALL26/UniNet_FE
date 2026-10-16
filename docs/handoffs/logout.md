# Logout

- Settings now exposes logout for authenticated students, partners and admins, independent of portfolio load errors. Disabled while a settings write is active.
- `authService.logout()` clears the entire in-memory `tokenStorage` session offline; the existing storage subscription clears account/access token/auth status.
- Root Stack is keyed by authenticated account identity. Logout/account switch unmounts old screens and discards component state, including drafts and loaded profile data. Refreshing tokens keeps the same screen tree.
- Settings clears its own loaded state and routes to login; no server account/portfolio deletion.
- `apiRequest` checks session generation before returning responses and after JSON parsing, rejecting results belonging to a logged-out or replaced session. Existing refresh generation checks prevent session resurrection.
- Verification: Node regression suite and TypeScript pass. `tests/logout-browser-check.cjs` verifies student/partner logout offline, settings profile errors, empty login fields, and Back without authenticated requests. Screenshots: ignored `dist/logout-verification/`.
- Credentials currently live only in memory; no plaintext browser/native storage was added.
