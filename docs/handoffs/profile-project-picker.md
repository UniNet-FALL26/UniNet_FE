# Profile project picker handoff

- Spec: docs/specs/profile-project-picker.md. Latest request removes all three tabs; show one unified scrollable project list.
- ProfileProjectPicker reuses HubModal, ProjectCover and HubAction. Selection stays local until apply; manual entries, contribution, featured flag and ordering remain supported. Header/footer fixed; create action at bottom of content.
- Editor keeps picker mounted while confirmation or existing CreateProjectModal is shown. Pending profile and picker edits must save successfully before creation. Clean state opens creation directly. Cancellation preserves selection; creation success refreshes eligible projects and returns to same editor route/picker.
- Existing API eligibility remains completed projects only. Newly created active projects become eligible after completion; success notice explains this.
- Browser regression: node tests/profile-project-picker-browser-check.cjs (all APIs mocked), passed at 320/768/1024/1440. Covers no tabs, selection, dirty picker/profile, cancel, save failure/retry, create failure/retry, successful return and clean creation. Screenshots: dist/profile-project-picker/.
- Existing profile draft/editor/unload tests: 18 passed. Picker ESLint passed. Whole-project TypeScript blocked by unrelated opportunities.tsx and AssessorProfilePosts.tsx errors; no diagnostics in changed files. Editor also has existing React effect lint errors.
- Preserved unrelated pre-existing working tree changes, including social-link removal in editor.tsx. No commits or deployment.

- Follow-up: removed manual-entry button, onManual prop, manualProject state and manual-form branch. Existing saved entries remain; new projects use CreateProjectModal. Browser regression asserts the removed action is absent.

- Follow-up: removed selected-row details controls and visual checkbox. Blue background/border indicates selection; accessible checkbox state remains. Removed unused details state, update callback, import and styles. Existing metadata is retained.
