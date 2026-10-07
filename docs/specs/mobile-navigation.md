# Mobile navigation

## Objective

Replace the Expo starter tabs with UniNet's five-position mobile footer and an expandable quick menu. Authenticated users must be able to reach every named destination.

## Routes and behavior

- Footer: Cộng đồng (`/(tabs)`), Nhắn tin (`/(tabs)/messages`), Menu toggle, Thông báo (`/(tabs)/notifications`), Cá nhân (`/(tabs)/profile`).
- Menu shortcuts: Không gian làm việc, Cơ hội, Học tập, Sự kiện, Nhóm, Tài liệu, Kỹ năng, Khác.
- Menu opens above the persistent footer, closes by pressing the button or backdrop, and closes after navigating.
- Footer stays present on every shortcut page. Shortcut pages show their own heading and an honest empty state until their features are implemented.
- Unread badges are hidden at count zero and cap at `99+` when future data is connected.

## Visual and accessibility criteria

- White footer, existing UniNet blue active state, 4-square raised center button, compact labels, safe-area padding.
- Active footer destination has blue icon, blue text, and a small underline. Menu panel uses two rows of four on standard phones and two columns on narrow screens.
- All controls have accessible labels and at least 44px touch areas. Content must remain above the footer and quick menu.

## Verification

- `npx tsc --noEmit` passes.
- Build and install an Android APK; open all four footer destinations and all eight menu destinations, verify menu dismissal and no clipping on the connected phone.
