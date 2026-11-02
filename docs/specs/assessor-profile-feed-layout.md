# Assessor profile feed layout

User request: arrange the assessor profile like the supplied reference, preserving current real content and profile editing. Desktop keeps the 400px Settings rail outside the profile column. Profile hero gains tabs: Bài viết, Giới thiệu, Công việc & chuyên môn, Học vấn, Liên kết. Default posts tab shows compact profile summary/expertise/contact/links sidebar and the owner's community posts to its right; narrow screens stack content. Other tabs show the corresponding current editable details. Keep name/photo editing and grouped popup CRUD.

Community data must be real, current-owner-only, published/nondeleted, paginated. Existing API only exposes a global feed; add an authenticated own-post endpoint derived from JWT subject, reusing the projection and interaction APIs. Never filter only a first global-feed page or invent post/reaction/share data. Distinguish loading/error/retry from a successful empty state: “Chưa có bài đăng cộng đồng nào.”

Steps: 1) focused backend tests and own-post endpoint preserving global feed; 2) responsive tabs/compact summary and real post cards with existing like/bookmark/comment actions; 3) browser tests for empty, populated, error/retry, tabs, owner isolation, settings rail and 320–1920px layouts; retain existing profile/name/photo CRUD. No migration, unrelated editor changes, commit or deployment.
