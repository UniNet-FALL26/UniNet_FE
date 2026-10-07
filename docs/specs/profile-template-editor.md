# Personal profile template editor

## Acceptance
- Latest layout requirement: edit using the exact selected template renderer, including its original section grouping/order, desktop paired columns, hero, statistics and footer. Do not append JSON sections absent from that template. Show blank edit affordances only at existing template positions.
- Pencil controls edit name/nickname/headline/bio/contact and manual overall experience/GPA in place via popup. Camera controls at bottom-right of editable photo slots accept validated image URLs (no upload API exists). Derived project/technology counts are read-only and recompute on additions.
- Persist presentation identity and content in one authenticated editor save, retaining unrelated identity fields, all JSON content, privacy and appearance. Store manual experience/GPA in existing BasicInfoJson; no schema migration.
- Gallery/detail always use bundled sample data, with no portfolio request or account supplementation.
- `Chọn mẫu này` navigates to `/profile/editor` carrying the resolved template and theme.
- Editor requires sign-in, loads only the owner's portfolio, shows retry on failure and never fills missing sections with sample content.
- Template headings retain their own typography and inline plus controls; journey keeps education/experience together. Skills come from the catalog. `Xác nhận` updates the draft at that original template location; `Lưu hồ sơ` persists identity/content together.
- Retain unrelated identity fields, content, privacy and appearance. Choosing a template previews it; it does not silently publish or persist appearance.
- Loading, save failure/retry, duplicate submits and account changes are handled. No new dependencies, schema changes or changes to authentication.

## Structure/style
Expo Router + React Native. Route in `src/app/profile`, form components in `src/components/profile`, typed field definitions/validation in `src/utils`. Reuse semantic colors, native Pressable/TextInput/Modal and the three existing renderers. JSON storage details stay out of user-facing copy.

## Ordered tasks
1. Remove user fetching from sample preview and wire selection navigation. Verify existing sample tests.
2. Define section forms and immutable data updates; test missing fields, required values, unsafe URLs, numeric ranges, catalog skills and preservation of existing data before implementation.
3. Wrap the original renderer in an editing context. Place controls inside its native hero, headings, cards, statistics and footer; expose supported empty slots without adding foreign sections. Verify TypeScript, render tests, browser navigation, popup confirmation, derived counts, save/retry and responsive layouts.
4. Save whitelisted presentation identity and portfolio together through the authenticated editor endpoint. Verify validation prevents partial writes and retains privacy, appearance and unsupported content.

## Commands
`node tests/profile-preview.test.cjs`
`node tests/profile-editor.test.cjs`
`npx tsc --noEmit`
`npx expo start --web --port 8082`

## Boundaries
Preserve unrelated user edits. Extend authenticated portfolio API with an editor-save contract for whitelisted presentation fields; never submit fixture content or client-supplied private/verification fields. No uploads, dependencies, schema migrations, publishing or commits.
