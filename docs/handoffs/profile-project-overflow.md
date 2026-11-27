# Profile project overflow

- `ProfileProjectsGallery` is shared by modern/showcase/landscape project sections. Profile viewers and thumbnails show the first three projects in saved order. `Xem thêm (+N)` sits beside the heading and opens all projects when N > 0. Editor keeps its complete list and existing editing controls.
- Mobile currently also previews three cards, stacked. User's mobile sentence was incomplete; clarification was requested and the three-card assumption was communicated.
- Popup reuses `HubModal`: fixed header/close, scrollable responsive grid, backdrop/back/Escape dismissal and existing focus management. Cards close it before routing to `/group/[id]` through `PortfolioProjectCard.onNavigate`. No project authorization or backend changes.
- Regression: `node tests/profile-project-overflow-browser-check.cjs` passes for all three templates at 1440/768/375/320px. Covers 0/1/3/4/8 projects, overflow count, heading alignment, scrolling, close/Escape, detail navigation and absence of edit controls for visitors. Screenshots: `dist/profile-project-overflow/`.
- Navigation unit suite passes, including close-before-route ordering. Changed files have no TypeScript diagnostics; existing whole-project errors remain outside scope. ESLint has no errors; existing unused-import warnings remain in showcase/landscape section files.
