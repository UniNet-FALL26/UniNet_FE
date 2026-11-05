# Partner profile corrections

- Business editor displays and accepts `dd/mm/yyyy`; API storage stays `yyyy-mm-dd`.
- Reject impossible dates and future dates; allow clearing the date.
- Students opening a company from recruitment details use the existing company profile screen.
- Public mode shows introduction, business facts, gallery, posts and open jobs. Hide editing, upload, settings, verification management and logout actions.
- Closing the public profile returns to the selected job; opening a company job keeps student recruitment navigation.

## Implementation and verification

1. Add date conversion regression tests, then update editor conversion and label.
2. Add public profile mode to the existing screen and reuse its components. Extend public API with introduction data.
3. Verify owner and student flows with browser fixtures, `node --test tests/partner-introduction.test.cjs`, and `npx tsc --noEmit`.

Keep current React Native/Expo conventions and API authorization; no dependencies or database changes.
