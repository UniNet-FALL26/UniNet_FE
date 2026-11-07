# Community feed pagination — 2026-11-07

- Cause: repeated `FlatList.onEndReached` events could request the same page concurrently; responses were appended without deduplication. Overlapping pages produced repeated `post-{id}` keys.
- Fix: one active feed request, a synchronous loaded-page guard, and ID-based merging for both refresh and pagination. Incoming rows update existing posts without changing their position. Refresh cancels older requests; aborted/stale responses cannot append or reset loading state. Blur/unmount cancels the active request.
- Verification: three regression tests failed before the fix and now pass (repeated end events, overlapping/repeated rows, refresh replacing an older page request). Chrome pagination fixture confirms one page-two request and no duplicate-key console errors with overlapping rows; existing card browser regression also passes.
- No backend or key-extractor changes. Existing unrelated full-project TypeScript errors remain.
