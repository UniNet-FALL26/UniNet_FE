# Personal profile header

Add a left “Mẫu hồ sơ” button and right settings gear to the personal profile header, using existing React Native, Expo Router and semantic colors. Both controls have accessible labels and at least 44px touch targets. The header stays above scrolling content.

The template button opens `/profile/templates`, an empty state because previous templates were removed. Its back button returns to the profile tab. The gear opens existing `/settings`. No template designs or backend changes.

Plan: add an optional header slot to ModulePage; connect both actions in the profile tab; add the empty template route; verify TypeScript and Expo web export. Existing ModulePage callers keep their current layout. Use existing Pressable/StyleSheet conventions, e.g. `onPress={() => router.push('/settings')}`. No new dependencies.

Verification commands: `npx tsc --noEmit`; `npx expo export --platform web --output-dir .expo/profile-header-check`. Check both route targets exist and header labels appear in generated profile HTML.
