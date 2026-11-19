# Project documents table

## Upload metadata fix

- Root cause: document JSON/API originally exposed only URL/name/type despite
  UploadedFiles already storing byte size, owner account and creation timestamp.
- Extend HubFile response additively: nullable sizeBytes, uploadedAt, uploadedBy
  (HubPerson). Enrich documents/media by exact URL from UploadedFiles and profiles
  in batched queries. Ignore client-supplied metadata; no DB migration required.
- FE renders byte size, uploader avatar/name and upload timestamp in UTC+7.
  Missing registry entries remain unknown; never fabricate owner/date/size.
- Tests: backend registry lookup, historical files, spoofed metadata, rename
  persistence and missing records; browser metadata rendering and existing flow.
- Verified: 26 ProjectHubTests pass; documents Chrome fixture passes actual
  metadata display (2.4 MB, uploader name/avatar, 17/11/2026 16:04 Vietnam time),
  reload/rename persistence and enrichment immediately after upload.
  No TypeScript errors in changed components; existing unrelated errors remain.

- Objective: match reference document table without search, filters or sorting.
  Show file name, inferred format, metadata columns, actions and pagination.
- Current API HubFile contains only name/url/type; missing size/uploader/date
  render as an em dash. Do not infer uploader or timestamps from project owner.
- Actions: open, download, owner rename/delete, page selection and confirmed
  bulk removal. Preserve all other project details in document-only edits.
- Plan: build document table/menu; connect existing upload and guarded update;
  verify mutations, errors, permissions and responsive table scrolling.
- Stack/style: existing React Native, HubModal, HubAction and color tokens.
  Keep document actions separate from media. No backend/dependency changes.
- Checks: `node tests/project-documents-browser-check.cjs`,
  `node node_modules/typescript/bin/tsc --noEmit`; focused browser fixture covers
  table/pagination, cancel, rename/delete retry, downloads and mobile menu.
- Boundaries: use existing API validation/owner authorization; confirm deletes;
  reject blank names and preserve extension. Existing upload limits unchanged.
- Implemented ProjectDocumentsPanel and anchored ProjectDocumentMenu. Document
  mutations share the parent resource lock with uploads and preserve other details.
  Web downloads use a fetched blob without credentials; native opens the file URL.
  Preview opens the original file using the existing safe URL helper.
- Picker now includes XLSX/PPTX MIME types already supported by backend storage.
- Chrome fixture passed pagination, upload, format badges, rename validation and
  persistence, download, bulk deletion cancel/retry, mobile menu bounds, empty
  state and non-owner restrictions. Desktop/mobile screenshots inspected.
- TypeScript still fails only in existing opportunities.tsx/AssessorProfilePosts.tsx.
