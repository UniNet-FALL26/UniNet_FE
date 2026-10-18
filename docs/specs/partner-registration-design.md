# Partner registration design

- Match the supplied partner selection/account reference: full-viewport desktop split layout, illustrated campus/partnership sidebar, compact brand and value propositions, centered form heading and a five-choice selector with a full-width fifth option.
- Reuse the existing selection → account creation flow and partner type IDs 0–4. Account creation still submits the existing fields and navigates to the company area. Progress labels describe the real steps: partner type and account information. No invented second business-information stage.
- Desktop ≥900px: illustrated left side and right form. Mobile: compact illustrated introduction above a full-width form; small widths stack choices as needed. Preserve form validation, terms, Google configuration feedback and existing navigation.
- Plan: add a shared partner shell and illustration; restyle selection and account form; verify TypeScript, responsive screenshot bounds, all five type values, validation, back navigation and a mocked successful registration. No backend/dependency changes.

- Desktop revision: remove outer margins, rounded frame and 900px height cap; artwork fills the left panel. Keep the right form fixed on regular desktop heights, with compact spacing on laptops. Keep scrolling available on mobile and exceptionally short windows.
