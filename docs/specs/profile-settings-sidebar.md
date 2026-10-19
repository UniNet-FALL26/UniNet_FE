# Profile/settings split layout

- Web >=1200px: profile fills the left column; a 400px settings rail appears on the right. Each column scrolls independently. Smaller windows/native retain the profile and standalone settings page.
- Extract existing settings into a reusable panel. Embed without duplicated identity/header/footer; preserve account/verification dialogs, template selection, display switch and logout.
- Update the visible profile after a successful display change. Size starter and saved templates to the actual left column.
- Verify responsive geometry, display changes, dialogs, standalone settings and TypeScript. No backend changes.
