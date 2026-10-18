# Student starter refresh

## Acceptance
- New students see their real name, nickname and avatar beneath the existing profile header. Hide the location row. Starter content scrolls below the header and never overlays it.
- The avatar camera selects an image and opens the shared AI portrait popup in place. Cancel leaves the profile unchanged; confirm saves the processed avatar while preserving other fields. Errors remain visible and account changes/blur discard pending work.
- Use the user's cover first, preserving its full image; missing or failed covers use the bundled blue campus artwork. Missing avatars use initials.
- Match the supplied reference: blue introduction panel, purple strengths row, blue projects row and dark blue template discovery banner. No fictional profile content or premium purchase flow.
- Only the bottom discovery banner opens the existing template picker. Strengths/projects cards are informational and have no press handlers; the header pencil opens the profile editor. Existing saved portfolios and photo upload behavior remain intact.
- Introduction reference update: include the three benefits “Được nhìn thấy”, “Tạo dấu ấn cá nhân”, “Mở ra cơ hội mới” with their supplied descriptions, plus an illustrated portfolio sheet. Expand the strengths/projects descriptions to match the reference and use matching checklist/browser artwork. On mobile, keep body copy readable, stack the two cards and prevent horizontal overflow; on desktop use a wide hero and paired cards. Retain the working template action.

## Implementation and verification
1. Add render tests for fallback artwork, user cover precedence and starter actions.
2. Refresh the starter component, keep suggestion cards static and preserve its separate fixed header.
3. Run targeted profile tests and TypeScript, then inspect mocked browser screens at 320/440/768/1440px, including scroll bounds and cover fallback.

Stack: Expo Router, React Native, TypeScript, expo-image. Tests use the existing Node VM renderer and Playwright browser harness. No dependencies, backend changes or automatic profile writes.
