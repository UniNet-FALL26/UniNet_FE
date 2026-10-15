# Student profile before portfolio creation

Show the student's actual cover/avatar/full name/nickname on the personal tab and invite them to choose a portfolio template with useful Vietnamese copy. Missing photos use decorative cover/initials; sample people or biographies never appear. Students without saved portfolio content see onboarding even though the API serializes a default template for new accounts.

Plan:
1. Define/test meaningful portfolio content detection. Cover, avatar, account identity and default appearance do not count as portfolio content.
2. Add a responsive identity + onboarding component using UniNet colors and accessible real-image fallbacks. Introduce skills/projects/community benefits and a primary Choose template action.
3. Fetch own student portfolio on focus with cancellation/account isolation, loading/error/retry states. Preserve existing nonstudent behavior. For saved portfolio content display the selected native renderer and link to its editor, so onboarding disappears after saving.
4. Verify TypeScript, targeted unit/render tests and mocked browser state/navigation at 320/768/1440px. Inspect native screen without changing user data. Document handoff.

No database changes, commits or automatic profile writes. Previous tests/docs remain local. Commands: `npx tsc --noEmit`, `node --test tests/*.test.cjs`, Chrome mocked UI checks via the existing Expo server.
