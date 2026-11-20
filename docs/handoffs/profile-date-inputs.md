# Profile date inputs

- Education fields include placeholder examples; date fields use `DD/MM/YYYY`.
- `CalendarDateInput` provides a calendar button on the right and dismisses the keyboard before opening. Profile entry forms and project timeline settings share this control and `ProjectTimelineDateModal`.
- Profile dates accept complete `DD/MM/YYYY` or ISO `YYYY-MM-DD` values. `profileDateToIso` validates calendar days, including leap years; entered values remain unchanged when saved to the local draft.
- `addProfileEntry` rejects invalid dates and end dates before start dates. Certificate “Ngày cấp” uses the shared date input/calendar and stores the full date in the existing `year` string property; legacy year-only values remain readable. Optional dates may be blank. The `period` input has been removed; existing values remain available for legacy display.
- Profile calendar bounds follow the other start/end date. Project timeline constraints and save flow remain in `ProjectTimelineSettings`.
- All three CV journey templates use `formatProfileMilestonePeriod`: explicit start/end dates take priority over descriptive period text; a missing end date displays “Hiện tại”. ISO dates display as `DD/MM/YYYY`.
- Display regression tests: `node --test scripts/test-profile-milestone-dates.cjs`.
- Journey editing exposes one icon-only add button for education. Education forms omit GPA; existing GPA values are preserved when editing.
- `EditEducationEntry` adds a pencil to the right of each education date in editor mode only. Sorted timeline entries retain their original education index, including Landscape's `sourceIndex` metadata.
- `updateProfileEducation` validates and replaces the selected item without appending, preserving unrelated items and stored metadata. The editor still requires “Lưu hồ sơ” to persist the draft.
- Edit/control tests: `node --test scripts/test-profile-entry-dates.cjs scripts/test-profile-education-controls.cjs`.
- Validation: `node --test scripts/test-profile-entry-dates.cjs`; ESLint for the four changed source files. Device visual verification remains pending.
