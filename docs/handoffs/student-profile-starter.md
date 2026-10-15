# Student personal profile starter

Replaced the student's placeholder personal tab with actual owner profile presentation. `StudentProfileStarter` shows cover/avatar/full name/nickname and a Vietnamese invitation explaining skills, projects and community connections; Choose template opens the existing template gallery. Missing/broken photos use decorative cover artwork or initials, never sample people/data. Desktop benefits form three columns; mobile stacks them.

`hasStudentPortfolioContent` ignores identity/photos/default template settings. Saved introduction, portfolio text, manual metrics or entries transition to the native renderer using saved appearance and expose its editor link. The API currently emits a default template even without a saved portfolio; onboarding is therefore based on content, not that default template string. Nonstudent ModulePage behavior remains in place.

The personal tab fetches on focus with account isolation, abort on blur/account changes, owner checks and loading/error/retry states. Returning after editing refreshes saved content. No profile writes, backend changes or database migrations were introduced.

Validation: TypeScript and 72 Node tests pass. Mocked Chrome starter check covers 320/768/1440px, own identity, null/real photos, no sample identities, choose-template navigation, focus refresh, load retry and existing-content transition/editor route with zero writes. Visuals reviewed on web and attached Android; no device user data was changed or saved. Existing editor browser check was updated to count demo reads independently from the new personal-tab fetch.

Files: `src/app/(tabs)/profile.tsx`, `src/components/profile/StudentProfileStarter.tsx`, `src/utils/student-profile.ts`. Spec/tests/docs remain local; no commits or pushes performed. Screenshots under ignored `dist/profile-verification`.
