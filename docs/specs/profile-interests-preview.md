# Personal interests in profile samples

- Scope: show “Sở thích cá nhân” in sample previews and thumbnails for modern, showcase and landscape templates. Use bundled examples: reading, photography, travel and badminton.
- This initially shipped in demo mode. Real-profile selection and persistence are now specified in `profile-interests-editor.md`; the same presentation renders saved interests without sample-data fallback.
- Match each template's typography and theme; wrap interest labels on narrow screens. Honor the existing section visibility/order pipeline.
- Visual treatment: uniform compact icon-and-label tags, sized to their content and wrapping naturally. Use existing surface/border/accent tokens across themes. No lead item, captions or decorative watermarks. Forty-eight sample interests cover sports, art, technology, entertainment, travel and everyday life; icons are decorative and do not duplicate accessible labels.
- Implementation: add optional sample interests type/data, a shared themed section, then wire the section into the three templates and preview metadata.
- Verify: `node tests/profile-preview.test.cjs`; focused browser check of all three previews at 375/1440px; ESLint for changed TS/TSX files.
- Keep the existing React Native/Expo patterns and dependencies; no backend/schema changes.
