# Hidden web scrollbars

- `src/app/_layout.tsx` imports the existing global stylesheet so every route and React Native modal portal receives it.
- `src/global.css` hides scrollbar chrome with `scrollbar-width: none`, legacy `-ms-overflow-style` and WebKit scrollbar rules. Overflow, scrolling, focus and input behavior are unchanged. No individual screen rewrites or native indicator changes.
- TypeScript, static web export and diff whitespace checks pass. All 86 exported HTML routes include the global stylesheet.
- Chrome inspection on an isolated dev preview (8086): document and both page/modal scroll regions report hidden scrollbars. Real mouse-wheel input moved the modal's scroll position from 0 to 350. Screenshot: ignored `dist/hidden-scrollbars-dialog.png`.
- Existing partner verification and Student Settings browser regressions pass, covering responsive pages, account/policy dialogs and verification submission states with intercepted API fixtures. Firefox/Safari and physical native devices were not run.
