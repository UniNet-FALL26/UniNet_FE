# Personal interests sample section

- Initial scope was templates first; owner editing and persistence are now implemented. See `profile-interests-editor.md` for the current flow.
- `ProfileInterests` renders themed labels with wrapping in all three templates, using saved interests on real profiles and bundled interests in previews.
- Bundled sample includes 48 interests covering sports, arts, technology, entertainment, travel and everyday life. Every sample has a matching Expo Symbol. Preview metadata and sample section order include `interests`.
- Verified: preview unit suite, changed-file ESLint, browser previews at 320/375/1440px for all three templates, gallery thumbnails, no horizontal overflow. Screenshots in `dist/profile-interests/`.
- Owner selection, API storage/validation and viewer display are complete in the follow-up described above.
- Final design: compact tags with a 16px Expo Symbol in a small tinted badge and a text label. All items use identical styling; no oversized tiles, captions or watermarks. Content-sized widths wrap naturally; surface/border/accent colors follow each profile theme. Custom names use a heart fallback. Browser regression checks icon presence, tag bounds/height and wrapping for larger lists.
