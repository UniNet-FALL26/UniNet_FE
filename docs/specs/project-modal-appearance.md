# Project detail popup appearance

Presentation-only update matching the supplied reference: soft blue header with
white icon in a blue tile, subtle decorative waves, tinted form groups, rounded
inputs, pale footer and blue gradient primary actions. Links use numbered cards,
inline labels on desktop, stacked mobile fields and a dashed add action.

Reuse HubModal for all project popups and scope button treatment with context.
Keep all existing state, handlers, validation, permissions and API payloads.
Do not implement dragging or add functionality implied only by the reference.

Plan: shared popup shell/buttons; links cards; existing editor group surfaces;
verify existing links and project-card browser checks, mobile and desktop images,
typecheck and diff review. No dependencies or backend changes.

Commands: `node tests/project-links-browser-check.cjs`,
`node tests/project-cards-profile-browser-check.cjs` (PROFILE_TEST_ORIGIN on 8084),
`node tests/project-links.test.cjs`, `node node_modules/typescript/bin/tsc --noEmit`.
