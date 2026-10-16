# Portrait processing feedback

## Scope and acceptance
- Student portrait processing shows the original and a reserved result panel with an animated scan, an indeterminate status and a long-wait message after 20 seconds. Never invent progress or provider stages.
- Respect reduced motion; stop animation/timers on completion, error, replacement or unmount. Errors offer the existing explicit retry; no automatic paid retries.
- Preserve process → preview → confirm upload → draft → explicit profile save. Cancel remains usable during processing; confirmation stays disabled until preview exists.
- Keep existing UniNet colors, native/web compatibility, no new dependencies or changes to crop behavior.

## Plan and verification
1. Reproduce Gemini failure using existing backend fixtures and inspect deployment differences; never expose keys or send a user's portrait in diagnostics.
2. Add a focused browser regression with delayed/failing API fixtures, then implement a reusable portrait preview/status component.
3. Verify loading, failure/retry, success, cancellation, reduced motion and narrow/wide layouts. Run focused Node tests, TypeScript and Gemini backend tests.

Commands: `node tests/portrait-processing-browser-check.cjs`, `node --test tests/image-service.test.cjs tests/background-removal-service.test.cjs`, `npx tsc --noEmit`; BE: `dotnet test UniNet.Tests/UniNet.Tests.csproj --filter FullyQualifiedName~GeminiPortraitTests`.
Output: localized component, regression and handoff. Do not commit, deploy, change credentials or write real profiles.
