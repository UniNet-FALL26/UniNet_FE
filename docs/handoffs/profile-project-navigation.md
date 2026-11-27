# Profile project navigation

- `PortfolioProjectCard` opens `/group/[id]` using `projectId` for every profile viewer. Shared by all three profile templates.
- Thumbnail previews, profile editing and historical entries without a project ID retain their existing behavior.
- Detail UI and backend permissions are unchanged: outsiders can view completed projects; editing, uploads and management retain existing owner/member checks.
- Regression: `node tests/portfolio-project-navigation.test.cjs`, `node tests/project-hub-routing.test.cjs`.
- Browser: `node tests/profile-project-navigation-browser-check.cjs` against Expo web on port 8082; mocked APIs, three templates, 1440/375px, visitor/member/leader roles.
- Component ESLint passes. Full typecheck remains blocked by existing errors in `opportunities.tsx` and `AssessorProfilePosts.tsx`. The older cards browser suite also has stale member/document heading selectors.
