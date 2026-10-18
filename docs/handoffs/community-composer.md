# Community composer

- Replaced the community title/create toolbar with a white rounded composer aligned to the feed: owner avatar, pale-blue writing prompt and 4 colored actions. Responsive to 320px; no new packages.
- `CommunityComposer.tsx` loads the authenticated owner's avatar with fallback. Prompt opens an inline modal instead of the old nonexistent `/community/create` destination. Draft survives closing; text/image clears only after successful submission. Existing community/image APIs are reused, with loading/error handling and request cleanup.
- Documents/events open their existing pages. Survey creation and video upload have no existing implementation: survey displays an availability notice; composer currently attaches images only.
- New posts appear above the existing mock feed and survive initial feed loading. Existing local like/save handlers also update these posts. Feed API migration is outside this change.
- Verification: TypeScript and Chrome navigation/composer checks, 4 desktop + 3 mobile widths, mocked successful publication, empty-submit prevention, modal open/close, document/event links, avatar fallback. No real posts submitted; native devices and actual image upload not tested.
