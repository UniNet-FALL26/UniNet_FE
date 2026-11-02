# Assessor profile hero

User request: match partner photo/profile edit actions while showing only cover, avatar, full name and a verified tick next to the name. Remove nickname and role badge from the hero; retain the separate professional details section and existing profile editor.

Follow-up: the hero profile edit action edits only FullName in a single-field dialog. Place contact/professional editing behind a separate lower action, without name or nickname inputs. Preserve all other fields when changing name.

Use existing profile image picker, validation, upload and confirmation dialog. Save only the chosen photo against the latest owner profile, retaining all common/professional data and ignoring account changes/aborted requests. Verification tick reflects existing IsVerified; do not manufacture verified status. Show loading/disabled actions until profile data is available.

Steps: (1) add compact assessor hero with responsive partner-style photo/edit controls; (2) wire existing picker/dialog to owner profile API with abort support; (3) verify TypeScript, browser photo upload/cancel/failure/retry/persistence, full-name/tick placement and desktop/mobile layout. No backend schema/API changes.
