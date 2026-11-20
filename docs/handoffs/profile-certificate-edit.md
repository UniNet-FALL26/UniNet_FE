# Certificate editing

- All three profile templates use `EditCertificateEntry` at the card's upper right in editor mode; certificate logo camera controls are removed. Other photo controls remain available for their existing sections.
- `ProfileEditableTemplate` forwards `onEditCertificate(index)` to the editor. `ProfileEntryForm` pre-fills the selected certificate and updates it using `updateProfileEntry` without appending.
- `CertificateImageInput` uses the existing device image picker and upload service. It previews selected images, supports replacement/removal, preserves the original on cancel/failure, and aborts pending uploads on unmount.
- The form blocks confirmation and dismissal while choosing/uploading. The uploaded URL is stored as `logoUrl` after URL validation; there is no raw logo URL input.
- Confirming updates the local draft; “Lưu hồ sơ” persists it through the existing profile API.
- Verification: `node --test scripts/test-certificate-edit.cjs` plus the profile date, milestone, education control and safe-area regression suites. Device visual verification remains pending.
