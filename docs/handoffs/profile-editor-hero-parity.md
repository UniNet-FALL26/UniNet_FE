# Profile editor introduction parity

Hero field pencils previously reserved row width and a minimum height, shrinking headings and moving introduction content. Showcase email editing also increased the vertically centered introduction height. Modern lost its theme artwork when the owner had no cover.

- `EditField` has an opt-in overlay layout. Name/nickname/headline/bio use their original native text dimensions; pencils sit in the hero padding. Statistics retain their existing controls.
- Showcase editing uses the native contact button for valid personal emails. Missing/sample email controls occupy the existing action gap without changing introduction height.
- Modern uses themed cover artwork/mobile decoration when the personal cover is empty. Custom covers override this; missing portraits remain empty. Decorative defaults never enter the saved payload.
- No backend changes. Existing sample skill category label edits are unrelated and preserved.

Verification: TypeScript passes; 60 Node tests pass. Mocked Chrome geometry comparisons pass for all three templates at 320/768/1440px, including typography, wrapping and no horizontal overflow. The full editor browser check passes for empty data, pencil/photo forms, additions, derived/manual metrics, save/load and retry behavior. Media tests cover blue/amber default artwork and custom cover precedence. Screenshots reviewed under ignored `dist/profile-verification`.

Run browser checks with `PROFILE_TEST_ORIGIN` set to the Expo web origin. Both browser scripts use isolated API responses and never write real profiles. No commit/push performed.
