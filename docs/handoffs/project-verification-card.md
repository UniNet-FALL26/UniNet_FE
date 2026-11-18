# Verification card visibility

- Newly created projects are Active (1). The detail screen previously required
  Completed (2) to render the entire card, hiding the introduction for new owners.
- Show the card to owners before completion, except rejected projects. Existing
  final reports still take precedence through the verification-result tab.
- Keep the current completed-owner-only booking action and pre-completion hint;
  do not change backend verification eligibility or booking APIs.
- Verify active/pending visibility, rejected/visitor gating and completed booking
  navigation with project-links browser fixture and verification-card unit tests.
