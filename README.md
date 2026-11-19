# Aero

Aero is a small, zero-dependency animation library: scroll-triggered entrances (`.animate` + `.in-view`), keyframe entrances (`.kf-enter`), hover interactions, scroll-linked animation (`.scrub`) and page arrival for browsers without cross-document View Transitions. Every rule is documented in `animations.css`.

Two files:

- `animations.css`: all the styles.
- `aero.js`: an optional plain-JS runtime (about 80 lines). It adds `.in-view` when elements scroll into view, and in browsers without CSS scroll-driven animations it drives `.scrub` elements from the scroll position, so scrubbed motion looks the same everywhere. Load it once: `<script src="aero.js" defer></script>`.

Not on npm yet; the name `aero-css` is free for when it is (`"private": true` blocks `npm publish`). Install it from GitHub, pinned to a tag. Use the tag's tarball URL: it's a plain HTTPS download, so build machines (Vercel, Cloudflare) don't need git or SSH:

```sh
npm i https://github.com/RijadRajkic/aero/archive/refs/tags/v1.2.0.tar.gz
```

Then load `aero-css/animations.css` (and `aero-css/aero.js` if you use in-view entrances or `.scrub`), for example `@import "aero-css/animations.css";` in a stylesheet your bundler processes, or copy `node_modules/aero-css/animations.css` into your static assets at build time.

To release a change: edit `animations.css`, bump `version` in `package.json`, commit, tag `vX.Y.Z`, push the tag, then update the tag in the URL in each site's `package.json` and run `npm i`.
