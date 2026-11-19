# Compact Settings controls

Reduce Settings controls slightly for both Student and Partner, retaining existing behavior and layout. Shared list rows use 72px minimum height, 16px vertical padding, 36px icons, 14px labels and 12px descriptions. Local action buttons use 44px minimum height and 14px text; existing smaller verification form labels remain unchanged. Scope styles to Settings and its account dialogs, preserving the global Button component and 44px close/touch targets.

Plan: update shared Settings row/button styles, apply matching action sizes to both account dialogs, then verify TypeScript and existing browser fixtures/screenshots at desktop/mobile sizes. No behavior changes, dependencies or new tests required.
