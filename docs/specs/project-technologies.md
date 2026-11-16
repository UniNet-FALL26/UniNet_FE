# Project technology icons and editing

Resolve technology names against the existing skill catalog and show its iconUrl
on the project detail technology card and in an owner-only editing popup. Preserve
custom names, punctuation (C#/C++/.NET), order and labels when icons are absent or
fail. Do not fetch arbitrary replacement logos or alter the backend contract.

Add a small underlined pencil at the card's top right. Popup: selected chips with
remove actions, searchable catalog with icons, custom-name addition, Cancel/Save.
Maximum 20 technologies, 80 characters each; case/space-insensitive deduplication.
Save PATCHes only technologies. Cancel performs no write; failures keep selection.
Keep sidebar/card sizing compact and preserve existing owner authorization.

Plan: pure normalization tests; icon/chip components; catalog card/editor; extract
the shared pencil now used by four cards; browser checks for catalog icons,
selection, custom names, cancel, save/retry/reload and owner-only actions.
Commands: `node tests/project-technologies.test.cjs`,
`node tests/project-cards-profile-browser-check.cjs`, `npx tsc --noEmit`.
No new dependencies, database migrations or backend changes.
