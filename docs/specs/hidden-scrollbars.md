# Hidden web scrollbars

Hide scrollbar tracks/thumbs on all app pages and popup portals, including browser text areas, while preserving wheel/touch/keyboard scrolling and existing overflow/layout behavior. The reference is the web scrollbar; native scroll indicator behavior is outside this styling change.

Plan: import existing global CSS at the root layout, apply browser-compatible scrollbar-only rules, then verify computed styles and actual scrolling on both page and modal content, run relevant browser regressions, TypeScript and static web export. Do not disable scrolling or rewrite individual page components.
