# Partner profile introduction

## Objective and acceptance
- Match the supplied profile: existing cover/avatar and verification badge, contacts and named social links, Introduction / Posts / Recruitment tabs.
- Introduction contains three cards: text plus exactly one optional image; business information (headquarters, founding date, industry, employee range, branches); company gallery (four previews, view all).
- Each card has its own add/edit modal. Select images from the device and show local previews. Only on Confirm upload new images through the existing Cloudinary `/images` API; save the resulting URLs to the profile after all uploads succeed. Cancel makes no upload or database write. Reuse successful uploads on save retry.
- Persist introduction metadata in the existing partner JSON; optional API additions preserve older clients. Saving one card merges the latest server profile and preserves other sections, identity, photos and websites.
- Existing profile/cover/avatar editing and recruitment remain functional. No fabricated company facts or stock photos.

## Stack / structure / conventions
Expo / React Native / TypeScript frontend; ASP.NET / EF Core backend. Keep company components under `src/components/company`, API mapping in `src/services/company.service.ts`; backend partner profile contracts and JSON data remain in their existing layers. Use `StyleSheet`, company color tokens, accessible labelled buttons and modal dialogs, e.g. `<Text style={s.title}>{title}</Text>`.

## Plan and verification
1. Extend optional API metadata and validate URLs, dates, lengths and collection sizes; backend round-trip / invalid-input tests.
2. Implement three cards and independent editors; integrate tabs and social links into current profile. Verify CRUD, URL persistence, cancel, errors and latest-profile preservation using Playwright mocks.
3. Inspect desktop/mobile screenshots at 320, 390, 768, 1440; run focused regression checks and document handoff.

Commands: `npx expo start --web --port 8083`; `node tests/partner-profile-introduction-browser-check.cjs`; `npx tsc --noEmit`; backend `dotnet test UniNet.Tests/UniNet.Tests.csproj --filter FullyQualifiedName~PartnerIntroductionTests`.

## Boundaries
Keep unrelated work. No dependencies or new database columns. No deployment. Validate input on both boundaries. Preserve existing verification-reset behavior for identity changes. Reuse existing image picker, JPG/PNG/WebP and 5 MB validation, and Cloudinary upload service. Database stores image URLs, never local/blob URLs or file bytes.
