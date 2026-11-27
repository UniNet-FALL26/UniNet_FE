# Profile project overflow

- Profile viewers and sample previews see at most three project cards. Keep existing ordering and card/detail navigation. Mobile also shows three by default, stacked vertically, pending clarification of the user's unfinished mobile requirement.
- When total exceeds three, show `Xem thêm (+N)` alongside the section title, where N is the number of additional projects. Hide it for three or fewer. Thumbnail previews show a non-interactive label.
- Open a themed modal with all projects, a fixed title/close control, and a vertically scrolling list. Responsive grid: three columns on wide layouts, two on medium, one on phones. Dismiss by close, backdrop or system back; close before navigating to project details.
- Apply across modern/showcase/landscape templates through one shared gallery. Editor retains all cards and existing photo/project-editing behavior.
- Plan: shared preview/modal and heading action slots; wire the three template sections; verify counts 0/3/4/8, mobile and desktop scroll/close/detail navigation, then update handoff.
- Checks: project navigation/routing regression tests, focused browser suite, changed-file ESLint and targeted TypeScript diagnostics. No backend or API changes.
