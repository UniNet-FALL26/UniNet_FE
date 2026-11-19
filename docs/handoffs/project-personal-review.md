# Personal review card and popup

Updated 2026-11-16. Frontend only; existing private review API unchanged.

- Removed the text action under the personal-review tiles. A small underlined
  pencil at the card's top right opens the editor. The title/overview/review now
  share the same pencil rendering within the detail screen.
- Extracted PersonalReviewModal from ProjectCommunityModals. Compact book header,
  smaller typography/actions, warning/book icons and helpful descriptions per field.
- Both inputs use AutoGrowingTextInput (80px minimum), growing/shrinking with text.
  Each field remains optional with the existing 10,000-character limit.
- Cancel writes nothing; busy locks duplicate saves/closing. Errors retain input;
  success updates the card quietly. Only challenges/lessonsLearned are sent to the
  current user's review endpoint; no project overview fields or user IDs are sent.

Browser checks passed for corner action, absent bottom action, two inputs,
grow/shrink, cancel, failure/retry, save/reload, 320px footer placement and hiding
the action from visitors. Image regression also passed; screenshots inspected.
APIs were fixtures; no real cloud/DB writes. TypeScript has only known unrelated
opportunities and assessor-post errors.
