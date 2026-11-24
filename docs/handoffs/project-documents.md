# Project documents table

## Responsive layout (2026-11-24)

- Latest: upload uses a borderless icon button with accessible label and busy
  indicator, aligned to the title on every viewport. Compact document rows now
  use bottom separators instead of outlined cards. Chrome fixture verifies
  alignment at 320/375/768/1024/1440px, border styles and the full upload flow.
  Focused ESLint passes.

- Follow-up: compact rows now show only file icon, wrapping filename and menu.
  Format/size/uploader/date move to the shared read-only “Thông tin tài liệu”
  HubModal, opened through “Xem thông tin” for all viewers on both layouts.
  Compact bulk selection is omitted; desktop selection is unchanged.
- Verified popup open/close/reopen, metadata and missing-value fallbacks,
  read-only member access and compact metadata hiding in the Chrome fixture.

- Replace horizontal ScrollView/measured table width with a 100% width table;
  table and header now share equal 16px card insets.
- Measure panel content width; below 850px render a vertical document list with
  wrapping filename, format/size, uploader/date and existing action menu.
- Compact header stacks upload button; footer stacks count and pagination.
  Checkboxes, file menu, menu items and compact page buttons use 44px targets.
- Existing mutation handlers, selection, permissions and dialogs are shared.
- Browser fixture passed at 320/375/768/1024/1440px: equal insets, no panel
  overflow, long filename wrapping, metadata, menu bounds, selection, upload,
  rename/download/delete retry, member/visitor permissions and empty state.
- Updated stale fixture for POST resources/documents and member upload rights.
  Focused ESLint passes. Full TypeScript check remains blocked by unrelated
  opportunities.tsx and AssessorProfilePosts.tsx errors.

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
