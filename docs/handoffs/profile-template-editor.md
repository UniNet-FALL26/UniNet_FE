# Profile template editor

## Delivered
- Sample gallery/detail always render bundled fixtures. Selection opens `/profile/editor?template=...&theme=...`, which requires authentication and loads only the owner's data.
- `ProfileEditableTemplate` wraps the original renderer with `ProfileEditContext`. Modern, Landscape and Showcase retain native hero, section grouping/order, columns, cards, statistics and footer. Only sections supported by the selected template receive controls; other JSON data remains stored.
- Heading plus controls open `ProfileEntryForm`; education and experience remain in the same journey section. Confirmation inserts data into the draft immediately. Pencils open `ProfileFieldForm` for presentation information, overall experience and GPA. Camera controls edit avatar, supported cover slots and project/article/certificate images.
- Image controls accept validated HTTP(S) URLs; no file upload API exists. Project and unique technology counts derive from draft arrays. Manual experience/GPA preserve legacy skill/education fallbacks when unset.
- Explicit save uses `portfolioService.saveEditor`, submitting whitelisted presentation fields and portfolio to `PUT /api/profile/portfolio/editor/me`. Successful saves update account presentation in auth state. Failed saves retain the draft; account changes/unmount abort outstanding operations; back navigation confirms discarding.

## Backend contract
- `PortfolioEditorRequest` combines presentation and content. Validation completes before mutation. A single `SaveChangesAsync` saves identity and CareerProfile together; full-name edits reset verification. Ownership is authenticated; clients cannot submit verification/private account fields.
- Manual experience/GPA use existing BasicInfoJson. Existing content-only endpoint remains compatible. No database migration or dependencies added. Restart the backend to load the new route.
- Saved appearance/privacy and unsupported JSON groups are retained. Template/theme selection previews appearance but does not persist it; existing backend appearance validation differs from frontend template/theme support.

## Verification
- TypeScript check and focused preview/editor/field/data/render tests pass.
- Headless Chrome with mocked API verifies sample-only preview, selection, native section grouping, inline edits/photo dialogs, immediate insertion/count updates, save/load retries and all three templates at 320/768/1440px. No real portfolio writes; screenshots under ignored `dist/profile-verification`.
- Backend portfolio suite: 19 tests passed, including editor roundtrip, validation/ownership and prevention of partial writes. API build passed; existing unrelated warning remains.
- Browser runner uses local installed Windows Playwright/Chrome paths. Native device rendering and file uploads are not verified.

## Main files
- `src/app/profile/editor.tsx`
- `src/components/profile/ProfileEditContext.tsx`, `ProfileEditableTemplate.tsx`, `ProfileEntryForm.tsx`, `ProfileFieldForm.tsx`
- Original template/hero/section primitives in `src/components/profile`
- `src/utils/profile-fields.ts`, `src/utils/profile-editor.ts`, `src/services/portfolio.service.ts`
- BE: `PortfolioContracts.cs`, `PortfolioService.cs`, portfolio controller and `PortfolioProductionTests.cs`
