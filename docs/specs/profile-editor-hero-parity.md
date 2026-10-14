# Editor introduction matches template preview

## Acceptance and plan
Use the exact native hero design in personal editing: preserve heading/body widths, typography, spacing, decorations and responsive column order. Pencils/cameras remain interactive but must not change text layout. Empty personal data remains personal placeholders, not sample biography/avatar content.

1. Reproduce editor/preview geometry with the same fixture in mocked browser sessions; compare name, nickname, headline and bio positions relative to each hero at 320/768/1440px.
2. Remove layout changes caused by pencil wrapper rows/minimum heights for hero fields. Keep generic statistic controls. Showcase email editing must preserve the native contact button when present and avoid adding height when the preview has no contact button.
3. Keep Modern's theme cover/decorations as template defaults when personal cover is absent, preserving explicit custom covers. Do not save decorative defaults into personal data.
4. Verify TypeScript, render/media regressions and real-browser geometry, empty data, both Modern themes, pencil forms and photo controls. Update handoff.

## Scope
ProfileEditContext, DeveloperHero/profile-media and hero edit calls in the three native templates. No backend, unrelated data edits, dependencies or automatic commits. Existing sample category label change remains intact.

## Commands
`npx tsc --noEmit`
`node tests/profile-editor-hero-browser-check.cjs`
`node tests/profile-editor-browser-check.cjs`
`node --test tests/landscape-render.test.cjs tests/showcase-render.test.cjs tests/profile-preview.test.cjs`
