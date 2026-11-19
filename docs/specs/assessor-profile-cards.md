# Assessor profile cards

Replace the flat details table with five independent cards: biography, contact, work/expertise, education and links. Each has a compact pencil action opening a popup containing only that group's fields. Keep hero full-name editing separate. Support create/read/update and clearing a group without modifying other groups, photos or identity. Always merge the edited group into the latest API profile, including on clear/retry.

Group three professional links together, render platform names and genuine brand marks rather than exposing URL text, and allow opening valid HTTP(S) links. Empty links remain labeled and nonclickable. Use colored semantic icon tiles for remaining cards/rows. No dependency/backend/schema change.

Use measured card container width to choose two columns above 700px available width and one column below; biography spans both columns. Preserve readable text wrapping at 320px, desktop sidebar and existing hero behavior. Popup buttons follow the compact name-editor styling. Verify TypeScript and browser group isolation, add/update/clear, failure/retry, link targets, brand icons and 320/390/768/1440px layouts.
