# Project member resource uploads

- Project owners and active project participants can add documents, images and demo videos.
- The frontend uses `POST /api/project-hub/{id}/resources/{documents|media}` with a single `HubFile` body and receives the updated `HubProject`.
- Backend authorization checks current membership and that the upload registry belongs to the caller. Display metadata comes from the registry.
- Appends run inside the existing project transaction/lock, preserve other project fields, are idempotent by URL and retain the 50-file category limit.
- Full project updates, document rename and deletion remain owner-only.
- No schema migration is required. Deploy the backend endpoint with the frontend change; rebuild existing APKs to include the updated UI/client.

## Verification

- `node --test scripts/test-project-resource-permissions.cjs`
- `dotnet test UniNet.Tests/UniNet.Tests.csproj --filter FullyQualifiedName~ProjectHubTests -m:1 -nr:false`
- Coverage: owner/member additions for all three file types, blocked outsiders/former members, forged metadata, upload ownership, invalid kind/type, idempotency and limits.
