# Project creation technology catalog

- CreateProjectModal reuses skillService.getSkills (/profile/skills), TechnologyLogo and technology normalization helpers.
- Catalog is always visible as wrapping icon pills beneath the search box. Click a pill to select/deselect; selected pills show blue background and check. No dropdown or separate duplicate selection list. Counter shows selected count/20; search is never submitted as a technology. No free-text add button or Enter-to-add behavior.
- Canonical catalog names remain in the existing technologies array; backend API/schema unchanged. Fetch is aborted on unmount, with visible loading/empty/error/retry states. Creation keeps its existing optional technology field and upload/origin behavior.
- Browser test: tests/project-create-technologies-browser-check.cjs uses real Metro client rendering with mocked APIs; verifies retry, search-only input, selection/removal, canonical POST payload, cap and mobile cancellation.
