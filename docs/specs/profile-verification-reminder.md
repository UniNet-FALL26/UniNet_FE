# Profile verification reminder

- Remove only the profile header template button; retain the introduction/discovery template actions and edit/settings icons.
- Replace the left header slot with a small red reminder for unverified accounts. Hide it on the registration calendar day in Vietnam (UTC+7), show 3 days the next day, then 2 and 1. From day four, show a plain request to verify without negative countdown or account restrictions. Verified accounts never see it.
- Source registration time from `Account.CreatedAt`, exposed as additive JSON `createdAt` on `AccountResponse`. No schema changes, client-invented registration timestamps or changes to authorization. Missing/invalid/future dates do not show a reminder.
- Prefer the current portfolio verification flag once loaded, falling back to the auth account profile flag. Refresh the countdown while the profile is focused, including on return to the screen.

Plan: add failing date-boundary and DTO tests; expose creation time; implement reminder and header; update browser fixtures for the remaining template action; verify TypeScript, backend tests, and mocked responsive profile behavior.

## Banner refresh
- Replace the small reminder with the supplied pink banner design: account-card illustration, red heading, supporting copy, information hint, verify CTA and dismiss button. Keep the existing date/verified eligibility and header edit/settings actions.
- CTA opens `/settings?account=1`. Dismissal applies to the current account for this mounted profile screen. Use truthful supporting copy without implying an unimplemented account lock.
- At narrow widths, put actions above the banner and wrap its content without horizontal overflow. Use existing React Native primitives and symbols; no new dependencies.
- Tasks: implement a focused banner component and integrate it; update browser assertions for layout, dismissal, CTA and eligibility; run `npx tsc --noEmit`, reminder unit tests and the mocked browser check.
