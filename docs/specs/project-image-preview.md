# Project image preview and confirmation

## Objective and scope

Add a small owner-only camera button at the top right of the project detail cover.
Picking a local PNG/JPG (up to 5 MB) opens a preview with Choose again, Cancel and
Confirm. Picking/replacing/canceling performs no upload or database write. Confirm
uploads through the existing authenticated image API, then PATCHes only logoUrl.
Keep the current saved image until both operations succeed. A DB retry reuses the
uploaded URL. Preserve owner authorization and existing schema/status values.

All project covers (detail, project cards, portfolio cards and preview) show the
entire image with contain sizing. Unused space uses a blurred cover of the same
image. Existing local sample assets remain supported.

## Implementation plan

1. Separate validated local image selection from upload; test cancellation,
   validation and upload sequencing. Keep existing document/media uploads working.
2. Add a shared full-image renderer and an image confirmation popup; integrate the
   owner camera button into project detail. Clean up temporary blob URLs.
3. Map Projects.LogoUrl into linked portfolio project CoverUrl, so image changes
   appear on the profile without copying stale URLs into portfolio JSON.
4. Verify browser file picking, reselect/cancel, upload-before-PATCH ordering,
   failure/retry, persistence on reload, non-owner access, contain/blur rendering,
   mobile/desktop layout, and focused backend portfolio tests.

## Structure, conventions and verification

Use existing Expo/React Native components in src/components/projects/hub, shared
uploadReportFile, and projectHubService.update(id, { logoUrl }). No dependencies,
schema migrations or remote deployment. Tests live in tests/*.cjs and the existing
UniNet.Tests/PortfolioProjectReferenceTests.cs. Record results in the TASK 2 handoff.

Commands: `npx tsc --noEmit`; `node tests/project-image-selection.test.cjs`;
`node tests/project-cards-profile-browser-check.cjs`; focused .NET build/vstest.
Browser tests intercept APIs and never upload fixtures to real Cloudinary.
