# Desktop header viewport

## Issue and scope
Student and assessor shells reserve a fixed 10px gap below their actual header. Because route content scrolls in a separate viewport, that gap remains blank and looks like an extra opaque header. The company shell had already been corrected locally.

## Plan and acceptance
1. Reproduce using the actual three role shell components with a long scrollable Slot. Measure header bottom against viewport top before and after scrolling.
2. Share the existing desktop header surface style across all three shells, without any bottom margin or opaque extra wrapper. Preserve header height, navigation, top/side margins and mobile navigation.
3. Check all role viewports, short/narrow desktop sizes, mobile visibility, auth route guards, existing navigation tests and TypeScript.

The separate management dashboard uses a rectangular sticky header with no outer bottom gap; no change is needed there.

## Implementation and validation
- `src/components/ui/desktop-header.styles.ts` owns the shared frame style. Student `app-tabs.shared.tsx`, company layout and `AssessorShell` use it. Bottom margin is explicitly zero and the real header does not shrink.
- Browser fixtures rendered the actual three shells with mock navigation/session services and a long scrollable Slot. Before: student/assessor gap 10px, company 0px. After: all 0px, header height unchanged at about 70px.
- After scrolling 567px, all three viewport tops remain flush with the real header bottom. At desktop widths 1440 and 1024 there is no horizontal overflow. At phone width 390, no desktop header is rendered and there is no horizontal overflow.
- TypeScript, seven auth-route guard tests and two assessor navigation tests pass. The shell fixture was temporary and removed after verification.
