# Personal profile interests

- Owner opens the interests selector from the profile editor in all three templates, including empty profiles. Search the existing 48 options, select/deselect multiple interests, clear selection, apply to draft or cancel without changes. Persist with the existing Save profile action and preserve dirty-state/save-error handling.
- Store `interests` as an optional array in the existing portfolio contract and BasicInfoJson. Missing/null preserves existing selections for older clients; an explicit empty array clears them. No schema migration.
- Server validates against the 48-option catalog, rejects unknown/blank/null/duplicate values and over-limit collections. The existing authenticated owner endpoints retain write authorization.
- Saved selections render with the established compact themed tags. Empty sections hide for viewers; editor shows an add action. Honor section hiding in visitor and application snapshots.
- Plan: (1) contract/catalog and backend regression tests; (2) JSON persistence and validation; (3) shared icon catalog, picker and editor integration; (4) API/service, browser save/reload/cancel/failure/privacy checks and review.
- Verify: `dotnet test UniNet.Tests/UniNet.Tests.csproj --filter FullyQualifiedName~Portfolio`; frontend profile regression scripts, focused browser checks on desktop/mobile and ESLint. Existing unrelated full-project TypeScript errors remain outside scope.
