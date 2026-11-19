# Contributing to Aero

Thanks for wanting to add to Aero. New effects, fixes and better docs are all welcome.

## How the repo is laid out

```
src/core.css        presets shared by every module
src/entrances.css   .aero-enter and the variants + keyframes
src/scroll.css      .aero-scrub (scroll-linked)
src/hover.css       hover effects
src/cursor.css      pointer-driven effects
src/arrival.css     page arrival
src/motion.css      the reduced-motion opt-in
src/aero.js         the runtime (in view, scroll fallback, cursor)
src/legacy.css      the 1.x stylesheet, frozen; don't add to it
scripts/build.mjs   builds dist/ (no dependencies)
dist/               built files; committed, because installs come straight from GitHub
```

## Adding an effect

1. Put it in the module it belongs to, or add a new `src/<name>.css` and list it in `MODULES` in `scripts/build.mjs`.
2. Write classes with the `aero-` prefix only. The build adds the `ae-` copies.
3. Settings are custom properties named `--aero-…`, read with a default: `var(--aero-distance, 32px)`. Don't set them on the element itself, so users can set them on a parent.
4. Animate `transform`, `opacity`, `translate`, `rotate` or `scale` only.
5. A new entrance variant also gets a line in the variant list in `entrances.css`, so it works with both `.aero-enter` and `.aero-scrub`.
6. Document it in the module's header comment and in README.md.
7. Run `npm run build` and commit `dist/` with your change. `npm run check` fails if `dist/` is out of date.
8. Note it under "Unreleased" in CHANGELOG.md.

## Guidelines

- No dependencies, in the CSS or the runtime.
- Keep it small: an effect is a few rules, not a framework.
- Everything must work in current Chrome, Safari and Firefox. If a browser lacks something, degrade to "no motion, content visible", never to "content hidden".
- Name things for what they do (`aero-hover-nudge`), not how (`aero-translate-x-4`).

## Releases

Aero follows semver. A release bumps `version` in package.json, moves "Unreleased" in the changelog under the new version, runs the build, and tags `vX.Y.Z`.
