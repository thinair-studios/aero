# Updraft

Updraft is a small, zero-dependency CSS animation library: scroll-triggered entrances (`.animate` + `.in-view`), keyframe entrances (`.kf-enter`), hover interactions, and page arrival for browsers without cross-document View Transitions. Every rule is documented in `animations.css`.

Not on npm yet; the name `updraft-css` is free for when it is (`"private": true` blocks `npm publish`). Install it from GitHub, pinned to a tag. Use the tag's tarball URL: it's a plain HTTPS download, so build machines (Vercel, Cloudflare) don't need git or SSH:

```sh
npm i https://github.com/RijadRajkic/updraft/archive/refs/tags/v1.1.0.tar.gz
```

Then load `updraft-css/animations.css`, for example `@import "updraft-css/animations.css";` in a stylesheet your bundler processes, or copy `node_modules/updraft-css/animations.css` into your static assets at build time.

To release a change: edit `animations.css`, bump `version` in `package.json`, commit, tag `vX.Y.Z`, push the tag, then update the tag in the URL in each site's `package.json` and run `npm i`.
