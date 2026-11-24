# Assessor work schedule

## Scope and assumptions
One primary **Lịch làm việc** destination at `/assessor-availability`. Replace internal tabs with a month calendar on the left and registered availability for the selected day on the right. Stack the calendar above the day panel on phones. No separate booked appointment tab or assignment fetching. Preserve availability validation, authenticated API ownership and confirmation before deletion.

## Presentation
White surfaces, uniform neutral borders, 8px corners, 12px body text, 20px page title. Compact 36px desktop controls and 44px mobile controls. At narrow widths fields and list actions wrap without horizontal overflow. No decorative gradients or colored card edges.

## Data and states
Query availability for the visible month grid (42 local dates, Monday first). Previous/next month, today shortcut, selected day, and dots mark registered availability. Show only intervals overlapping the selected local day, sorted chronologically. Cross-midnight intervals appear on each covered day, excluding an interval ending exactly at that day's midnight. Add/edit opens a compact inline form with the selected date prefilled. Delete offers confirmation/cancellation. Preserve 365-day horizon, 31-day duration and conflict handling. Abort stale loads on month/account changes; preserve feedback, retry, loading and empty states. Calendar width ~340px, flexible day panel, stacked under 760px. Do not invent a free/busy status.

## Plan and acceptance
1. Test month grid, year boundaries and local-day interval selection.
2. Replace screen tabs with calendar/day panels; preserve mutations.
3. Remove obsolete booked appointment code; update fixtures.
4. Verify selected days, month navigation, markers, create/edit/delete confirmation, empty/error/retry states and responsive layouts in a mocked browser at 320/390/768/1024/1440px. Run focused lint/types/tests and record limitations.

No backend, dependency, payment or unrelated profile changes. No commit or deployment requested.

Editor presentation update: add and edit both open an accessible modal dialog, rather than expanding the day panel. Preserve selected-date prefilling, validation, API conflict messages, cancellation and save behavior. Dialog must fit/scroll on phones, close via cancel/close/Escape while idle, and block dismissal during saving. Day-panel geometry stays unchanged. Pencil icon uses primary blue; delete icon uses error red with matching subtle hover/pressed backgrounds.

Web date/time picker: replace the browser's native datetime-local popup with a Vietnamese Monday-first calendar and editable 24-hour hour/minute inputs inside the existing modal. Preserve arbitrary minute precision, ISO/local-time conversion, min/max dates, disabled state and responsive scrolling. Calendar navigation and day selection must be keyboard reachable. No new dependencies; native platforms retain existing system controls.

Latest picker requirement supersedes the date/time picker above: the selected calendar date is fixed in the editor. Only start/end time can be selected. Tapping either time opens a circular number selector (no ticking/decorative clock), with hour selection followed by minute selection. Support 24 hours, all 60 minutes via pointer rotation and accessible numeric inputs, save/cancel and responsive nested dialogs. Existing cross-day slots preserve original dates and show their full date span when edited.

Current visual reference supersedes the circular selector: side-by-side vertical hour/minute wheels, centered blue selection bands, faded neighboring values, up/down controls, manual HH:mm fields and Cancel/Confirm footer. Hours 00–23; minute wheel in 5-minute steps with exact custom minutes preserved/inserted when entered manually. Scroll/touch, click and arrow selection update the manual fields; cancellation never changes the saved value. Preserve fixed date and validation.

Backend contract: availability GET accepts at most 31 elapsed days per request. Split the 42-day grid into contiguous chunks, combine only complete successful responses, deduplicate slots crossing chunk boundaries by ID, and preserve abort signals. Browser fixtures must enforce this limit.
