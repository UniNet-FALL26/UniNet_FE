# Portfolio appearance and display

## Scope and contract
Implement the attached request on the existing student portfolio, preserving prior UI changes and company behavior. Gallery and preview remain demo-only; actual profiles always read server data.

- `appearance.profile.template/theme` are part of the editor draft, including selections arriving through route parameters. Compare the entire save payload with a server baseline; reset baseline only after successful save. Provide catalog-driven theme buttons in the editor. Reverting selections or fields to baseline clears dirty state.
- Existing `PUT /api/profile/portfolio/editor/me` validates and atomically saves identity, content and appearance. Existing generic content save retains its compatibility behavior. Preserve unrelated appearance JSON keys and unsupported content sections.
- Add optional nullable `appearance.profile.showPortfolio` in existing `CareerProfiles.AppearanceJson`. Absent/null means auto: show when content exists. False renders default profile without deleting content or changing `isPublic`.
- Add owner-only, student-only `PUT /api/profile/portfolio/display/me` with `{ "showPortfolio": boolean }`. Update only this JSON property, using the authenticated account, never a supplied account ID. Return the owner's refreshed portfolio.
- Student settings adds a server-backed switch with pending, error/retry and confirmed success states. Company settings stays unchanged.
- Existing anonymous/authorized `GET /api/profile/portfolio/{profileId}` retains the active/public-or-owner access policy. Reject company profiles in this student viewer. Nonowners receive no catalog or hidden portfolio sections; disabled portfolio returns only safe identity and display configuration, with no saved portfolio contents.
- Add `/profile/view/[id]` for reading another student's profile through that endpoint; default identity display and template display are read-only and cannot expose owner editing controls.
- Legacy Modern `orange` is accepted and normalized to current `amber`; other invalid pairs return existing structured `INVALID_APPEARANCE` errors. Canonical catalog: Modern blue/amber, Showcase mint/orange, Landscape blue/pink/mint.

## Ordered slices and acceptance
1. Tests and BE contract: validate all template/theme pairs; persist editor appearance; preserve content/privacy/unknown JSON; display-only update; safe public projection; access and student role checks. Verify SQLite database rereads and actual HTTP controller requests.
2. FE draft utility and editor: tests for appearance-only saves, reverting baseline, content+appearance, and unchanged server data. Add theme palette, retain discard confirmation, lock navigation during save. Verify TypeScript and browser.
3. Settings and viewers: switch reads/writes server config; personal tab respects mode while retaining editor access; visitor route is read-only. Verify toggle/re-enable, reload, multiple sessions and privacy.
4. Regression/review/handoff: relevant existing tests, TypeScript, available lint, production web export and BE build/test. Document commands, exact payloads, verified scenarios and deployment limitations.

## Implementation constraints
Reuse React Native Pressable/Switch, semantic colors, Expo Router, services and EF Core JSON fields. No dependencies or production data mutations required. No change to `isPublic`, no demo substitution, no company UI changes, no commits or deployment requested. Real HTTP tests use an isolated SQLite-backed test server; PostgreSQL deployment validation remains separate if no local database is available.

## Commands
FE: `node --test tests/profile-draft.test.cjs`; `npx tsc --noEmit`; `npx expo export --platform web --output-dir dist/portfolio-display-check`; browser with local Metro and mocked API or isolated HTTP server.
BE: `dotnet test UniNet.Tests/UniNet.Tests.csproj`; `dotnet build UniNet.API/UniNet.API.csproj`.
