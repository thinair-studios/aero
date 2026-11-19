# Aero

A small animation library in CSS, with an optional 6 KB script. Entrances, scroll-linked animation, hover and cursor effects, and page arrival, that look the same in every modern browser.

- **CSS first.** Add a class, get the motion. Settings are custom properties with sensible defaults.
- **Scroll-linked everywhere.** Native CSS scroll timelines where the browser has them; where it doesn't, `aero.js` drives the very same animation, so it moves identically.
- **Never in your way.** Everything sits in `@layer aero`, so your own CSS always wins.
- **Pick a prefix.** Every class works as `aero-…` or the short `ae-…`.
- **Motion by default, reduced motion on request.** See [Reduced motion](#reduced-motion).

Not on npm yet. Install it from GitHub, pinned to a release tag (a plain HTTPS download, so build machines need no git or SSH):

```sh
npm i https://github.com/thinair-studios/aero/archive/refs/tags/v2.0.0.tar.gz
```

```css
@import "aero-css";            /* everything (dist/aero.css) */
@import "aero-css/hover.css";  /* or just the modules you use */
```

```html
<script src="node_modules/aero-css/dist/aero.js" defer></script>
<!-- or: import "aero-css/runtime" in a bundler -->
```

The script is needed for in-view entrances, the scroll fallback and cursor effects. Hovers and page arrival are CSS only.

## Entrances

```html
<h2 class="aero-enter aero-fade-up">Rises in when it comes into view</h2>
<ul class="aero-in aero-stagger">           <!-- .aero-in yourself: plays on load -->
  <li class="aero-enter aero-scale-up">…</li>
  <li class="aero-enter aero-scale-up">…</li>   <!-- starts 80ms later -->
</ul>
```

Variants: `aero-fade-up` `-down` `-left` `-right` `-in`, `aero-scale-up`, `aero-grow-up`, `aero-grow-right`, `aero-fan-left`, `aero-fan-right`, `aero-lift`, `aero-pass`.
Settings: `--aero-duration` `--aero-delay` `--aero-easing` `--aero-distance` `--aero-scale-from` `--aero-grow` `--aero-fan-x` `--aero-fan-y` `--aero-fan-rot` `--aero-stagger`.
Presets: `aero-fast` `aero-slow` `aero-slower`, `aero-ease-expo` `-quart` `-back` `-spring`.

## Scroll-linked (scrub)

```html
<h2 class="aero-scrub aero-fade-up" style="--aero-scrub-range: entry 0% entry 80%">Follows the scroll</h2>
<li class="aero-scrub aero-pass" style="--aero-scrub-range: cover 0% cover 100%">Arrives, holds, steps back</li>
<svg class="aero-scrub aero-scrub-root" style="animation-name: my-glide; --aero-scrub-range: 0px 600px">…</svg>
```

Any entrance variant works, or your own `animation-name`. `--aero-scrub-range` reads like `animation-range` (`cover`, `entry`, `exit` with percentages); with `.aero-scrub-root` the animation follows the page scroll and the range is two lengths.

## Hover

```html
<a class="aero-hover-lift">Lifts 16px</a>
<li class="aero-hover-group">                   <!-- hover or focus anywhere in the group -->
  <img class="aero-hover-target aero-hover-rise">  <!-- lifts 6px and grows 3% -->
</li>
```

Effects: `aero-hover-lift` (`-sm` `-md` `-lg` `-xl`), `aero-hover-scale` (`-sm` `-md` `-lg`), `aero-hover-rise`, `aero-hover-nudge`, `aero-hover-shift`.
Settings: `--aero-hover-duration` `--aero-hover-easing` `--aero-hover-distance` `--aero-hover-scale` `--aero-hover-nudge` `--aero-hover-x` `--aero-hover-y`.
Keyboard focus triggers the same motion. On touch screens hover motion is cancelled, so a tap doesn't leave things stuck.

## Cursor

```html
<div class="aero-cursor" data-aero-smoothing="0.18">
  <div class="aero-tilt">Tilts toward the pointer</div>
  <div class="aero-spotlight">A soft light follows the pointer</div>
  <div class="aero-parallax aero-parallax-lg">Moves with the pointer</div>
</div>
```

`aero.js` writes `--aero-cursor-x` `-y` (0 to 1), `-cx` `-cy` (-1 to 1) and `-active` on each `.aero-cursor`; effects read them from any parent.

## Page arrival

For browsers without cross-document View Transitions (Firefox today). A small script in `<head>` adds `aero-arrive` plus `aero-from-right` or `aero-from-left` to `<html>`, and `<main>` slides in once. Where the browser has View Transitions, use those instead and skip this.

## Reduced motion

Motion plays by default, even when the visitor has turned on "Reduce motion": many people use that setting to calm the operating system, not to switch off a site's motion. To respect it, add `aero-reduce-motion` to `<html>`. Visitors who prefer reduced motion then see everything at once and still, and `aero.js` stops driving anything.

## Runtime API

```js
import Aero, { refresh, progress } from "aero-css/runtime";
refresh();        // re-scan now; new elements are picked up automatically anyway
progress(el);     // a scrubbed element's position in its range, 0 to 1
```

## Upgrading from 1.x

2.0 renames everything to the `aero-` / `ae-` prefix (`.kf-enter` → `.aero-enter`, `.scrub` → `.aero-scrub`, `.hover-rise` → `.aero-hover-rise`, `--animate-distance` → `--aero-distance`, `kf-fade-up` → `aero-fade-up`, `.in-view` → `.aero-in`) and drops the transition-based `.animate` entrances in favour of `.aero-enter`. The 1.x stylesheet ships unchanged as `aero-css/legacy.css` for code you haven't moved yet. See [CHANGELOG.md](CHANGELOG.md).

## Demo and tests

See every module live at **https://aero.thinairstudios.dev** (`docs/index.html`; locally, serve the repo root with any static server and open `/docs/`). `npm test` checks that `dist/` is current and runs the test suite in Chromium, Firefox and WebKit.

## Contributing

New effects are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

MIT © Rijad Rajkić
