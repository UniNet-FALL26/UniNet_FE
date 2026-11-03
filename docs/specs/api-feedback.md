# API feedback for student and partner

## Acceptance
- Action API responses use a shared top overlay: success/error icon, readable Vietnamese message, slide down on entry and dismiss after 3000ms without moving page content. New feedback replaces the current one and resets its timer.
- Success feedback applies to writes, not normal GET loading or authentication refresh. Upload success is intermediate and stays silent until profile save completes. Aborted/stale-session work must not report success.
- Parse business messages, validation dictionaries and problem responses. Translate known API codes and reject technical diagnostics/raw codes; fall back to an operation-specific reason and next step based on HTTP status. Preserve internal `ApiError.code` for application logic.
- Replace the persistent profile success banner shown in the request, plus student profile/settings action feedback. Keep confirmation dialogs, field validation and retry controls. Mount the toast inside active photo/profile modals on native so errors remain visible.

## Plan
1. Add deterministic tests for error localization, success labels, timer/reset/cancellation, and API policy.
2. Add a small toast store and animated viewport, then wrap both existing API clients without changing session refresh/multipart behavior.
3. Route profile/student settings/community feedback into the shared presentation and add modal hosts where needed.
4. Browser-check success and business/server/network errors for both roles, 3-second dismissal, replacement, mobile layout and photo retry. Run TypeScript and relevant existing regressions.

## Boundaries
No backend changes, dependencies, real external messages or credentials. Existing business error codes and API return values remain available to callers. Commands: `node tests/api-feedback.test.cjs`, `node tests/api-feedback-browser-check.cjs`, `npx tsc --noEmit`.
