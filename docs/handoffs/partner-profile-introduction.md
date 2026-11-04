# Partner profile introduction

- Owner partner profile now has Introduction / Posts / Recruitment tabs; social links appear as icons and platform names below the existing identity header.
- Introduction has independent about, business information and gallery cards/editors. About shows exactly one optional image; gallery previews four images and opens the full collection. Editors select device files with local previews; no URL textboxes. Confirm uploads new files through the existing `/images` Cloudinary endpoint, then persists returned URLs via `/profile/partner` after the whole batch succeeds. Cancel makes no upload/write. Successful uploads are cached per editor for retry after partial upload or DB failure. JPG/PNG/WebP, 5 MB each, maximum 20 gallery images.
- Optional `introduction` payload on `/profile/partner` and `/profile/me`: `imageUrl`, `foundedOn` (`yyyy-MM-dd`), `employeeRange`, `branches`, `galleryUrls`. Metadata lives in existing `Users.PartnerJson`; no new database columns. Older clients omit the property and preserve existing metadata; empty values explicitly clear fields.
- Editors retain existing remote images without reuploading, validate Cloudinary upload responses using `imageService`, validate founding dates and merge the latest server profile after uploads, before saving only the selected section. Existing verification reset rules still apply to business identity changes; about/gallery changes preserve verification.
- Backend changes need the API process restarted/rebuilt. No deployment performed.

## Verification
- `node tests/partner-introduction.test.cjs`
- `node tests/partner-introduction-images.test.cjs` (upload ordering, successful upload reuse, partial failure, abort)
- `node tests/partner-profile-introduction-browser-check.cjs` (default localhost:8083, mocked Cloudinary/API; file chooser, previews, no upload before confirm, upload before DB, gallery, cancel, partial upload / DB retry, latest data, tabs, 320/390/768/1440 layouts)
- `PROFILE_TEST_ORIGIN=http://localhost:8083 node tests/partner-profile-hero-browser-check.cjs` (PowerShell: set `$env:PROFILE_TEST_ORIGIN`)
- Backend: `dotnet test UniNet.Tests/UniNet.Tests.csproj --filter FullyQualifiedName~PartnerIntroductionTests --no-restore -m:1 -p:UseSharedCompilation=false -nodeReuse:false`
- TypeScript has pre-existing errors in opportunities styles/icon typing and `AssessorProfilePosts` comment modal props; no new partner errors observed.
- Screenshots under ignored `dist/partner-profile-introduction/` and `dist/partner-profile-hero/`.
