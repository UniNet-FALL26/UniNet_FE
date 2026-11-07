# Partner profile community cards — 2026-11-07

- Feed and Partner profile posts both render `CommunityPostCard`, composed from the shared gallery/footer/description. Card width caps at 626px and centers in wider profile columns, matching the desktop community feed; narrow containers remain fluid.
- Reused `CommunityMediaLightbox` handles clicked image indexes and wraparound navigation. `shareCommunityPost` owns device/web sharing and clipboard fallback for both entry points.
- Profile keeps own/author queries, author filtering, pagination, deduplication and empty/error states. Added real likes, save toggles, comments, editing, confirmed deletion and reporting through existing APIs/modals. Ownership controls edit/delete; public profile controls stay read-only. Async actions guard against obsolete profile/account scopes.
- Delete/report errors remain visible inside their dialog; failed deletion preserves the post and allows retry. Like/save requests deduplicate concurrent actions per post.
- Verified: community Chrome regression; Partner profile Chrome at 320/390/768/1440px including equal desktop feed/profile card widths, gallery indexes, likes, saves, mobile comments/count, editing, pagination, delete cancellation/failure/retry; public Partner profile Chrome at 375/1440px. Screenshots inspected under ignored `dist/partner-profile-posts`.
- Full TypeScript check still has existing errors in opportunities and AssessorProfilePosts; no errors reported for changed components. Native-device testing was not performed.
