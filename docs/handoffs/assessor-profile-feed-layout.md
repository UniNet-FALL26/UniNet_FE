# Assessor profile layout

- Hero retains name-only editor, verified badge, avatar/cover editors; adds five horizontally scrollable tabs.
- Default Bài viết tab: editable intro/expertise/contact/links sidebar and the owner's published community posts. Content below 760px stacks vertically. Desktop settings rail remains at viewport >=1200px.
- Other tabs show existing section cards/editors. Section saves and clears retain their existing contracts. Full professional-data clear stays under the work tab.
- All five section popups now use a colored header, section-specific description, close action and white bordered `ProfileTextInput` fields. Text fields expand with their content; number/phone/email remain single-line. Footer keeps compact save/cancel buttons and section-scoped clear confirmation. Name-only popup uses the same expanding input.
- `GET /api/community/posts/mine?page=1&pageSize=10` returns the existing `PostResponse[]` contract. Backend derives the active owner's profile from authenticated AccountId, excludes other authors/deleted/moderated posts, orders newest first, validates pagination and supports cancellation. No schema change.
- Deploy/restart BE with this endpoint alongside FE. Request failures show retry; only successful empty responses show “Chưa có bài đăng cộng đồng nào.” Likes, bookmarks and comment modal reuse community APIs. No sample posts or counters.
- Validation: TypeScript; browser checks for feed, existing section CRUD and hero/photo flows; backend CommunityProfilePostsTests and CommunityNotificationTests.
- Browser fixtures cover 320–1920px, settings visibility, tab content, own-author filtering, empty/error/retry, pagination/deduplication, likes/bookmarks. Screenshots: ignored `dist/assessor-profile-feed/`.
- Section CRUD browser checks also verify white inputs, long biography expansion and popup screenshots on desktop/mobile in ignored `dist/assessor-profile-cards/`.
- Summary-card editors use `assessorCardSection(section, true)` for both displayed fields and save/clear mapping: intro edits bio/job/company/university/address; skills edits expertise; contact edits email/phone; links edits three URLs. Joined date remains system-owned. Detailed-tab editors retain their original field sets. The modal captures its originating card scope and merges edits into the latest profile before saving.
