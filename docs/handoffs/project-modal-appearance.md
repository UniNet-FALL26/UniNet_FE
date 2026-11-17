# Project popup appearance

- Presentation only. HubModal now shares the reference's pale blue header,
  decorative waves, blue icon tile, rounded frame and footer across project
  popups. ModalAppearance context scopes gradient button treatment to dialogs.
- ProjectLinksModal uses numbered pale cards, horizontal desktop labels, stacked
  mobile inputs, red delete actions and a dashed add button. No drag behavior.
- Summary and overview fields use pale grouped surfaces. Summary, overview,
  technology and review editors use matching save icons/header presentation.
- No changes to state, validation, callbacks, service requests or permissions.
- Existing links and project-card/profile Playwright checks pass, including
  save/retry/cancel, nested dialogs, keyboard, reload and responsive widths.
- Typecheck reports the same existing opportunities.tsx and
  AssessorProfilePosts.tsx errors; none in modified files.
- Preview images: project-links-desktop.png, project-links-mobile.png and
  project-modal-{summary,overview,technologies,review}.png in workspace root.
