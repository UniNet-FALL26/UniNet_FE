# Profile project picker

## Objective and acceptance
Match the supplied compact blue/white picker: header, one unified list without tabs (updated user requirement), image rows, technology chips, checkboxes, selection count and fixed footer. Keep existing manual entries and linked project metadata. Put create-project action at the bottom of the scrollable list.

Create in place with the existing CreateProjectModal. Preserve picker selection and route on cancellation/success. Confirm saving any current profile or picker changes before creation; save failure retains data and prevents opening creation. Clean profiles open creation immediately. Refresh eligible projects after success; the existing completed-project eligibility rule remains in force.

## Structure and style
React Native / Expo, TypeScript. Modify ProfileProjectPicker.tsx and profile/editor.tsx locally; reuse HubModal, HubIcon, ProjectCover and existing services. Example: `setDraft(current => current.filter(item => item !== project));`. No dependency, API or schema changes; preserve unrelated working tree edits.

## Ordered tasks
1. Add browser regression covering selection, no tabs, cancellation, dirty confirmation, failed/successful save, creation success and return route. Verify failure before implementation.
2. Replace picker presentation; load eligible projects directly and include saved manual entries. Verify typecheck and browser selection scenarios.
3. Connect existing create modal and save guard, retaining picker state. Verify full mocked browser flow and responsive 320/768/1024/1440 layouts.
4. Review diff and add concise handoff.

## Commands / testing
- Dev: `npx expo start --web --port 8090`
- Types: `npx tsc --noEmit`
- Regression: `node tests/profile-project-picker-browser-check.cjs`
- Existing profile tests: `node --test tests/profile-editor.test.cjs tests/profile-editor-unload.test.cjs tests/profile-draft.test.cjs`
Browser tests mock APIs and write no real user data. Never change eligibility or navigate to a project detail page on creation.

## Follow-up: remove manual project entry
Remove the manual-entry action, callback and editor form state/branch. Existing saved entries remain supported. New project creation uses CreateProjectModal. Browser regression must assert the manual-entry action is absent.

## Follow-up: simplify selected rows
Remove contribution/featured/order controls and visual checkbox indicators. Selected rows use blue background/border; keep accessible checked state and click/keyboard toggling. Preserve saved project metadata.
