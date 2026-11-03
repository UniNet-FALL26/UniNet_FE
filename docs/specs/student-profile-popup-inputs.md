# Student profile popup inputs

All student portfolio templates share ProfileFieldForm and ProfileEntryForm through the editor. Replace their blue-filled input styling with a scoped white input, soft border, readable padding and blue focus border without the browser's extra black outline. Do not change login/partner/global input styling.

Text inputs wrap and grow/shrink with content (including initial values and width changes); keep numeric/search controls single-line. Bound modal height and scroll its content so confirm/cancel remain reachable for long text and small screens. Preserve existing draft, validation, confirm/cancel and final save behavior. Verify TypeScript, existing profile tests, and browser fixtures across all registered templates at desktop/mobile widths, including initial long content, growth, shrink, saved values and cancel.

Follow-up request: compact the Hủy/Xác nhận buttons in field, entry and photo popups (38px high, 13px text, content-width buttons aligned right).
