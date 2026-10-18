# Responsive welcome screen

- Match the supplied desktop reference with a full-height campus illustration on the right, diagonal white content panel, existing logo, student-community badge, two-tone heading, login/register actions, partner registration and security footer.
- Render all copy and navigation as native components. Reuse the supplied bitmap only inside a clipped illustration viewport showing its right-hand scene; its embedded UI must never be visible. Keep the reference intact in the assets directory.
- At widths below 900px, match the mobile reference: compact logo/badge and heading over a faded sky, edge-to-edge campus/student scene, full-width actions on white, partner divider and pale blue polygon footer. Allow vertical scrolling on short screens. Desktop also scrolls when needed. Preserve existing auth destinations and accessible keyboard controls.
- Plan: update the existing welcome screen and add the supplied asset; verify TypeScript, responsive screenshot bounds, image loading, keyboard focus and all three auth routes at 320/390/440/768/1024/1440/1920px. No backend, dependency or authentication changes.
