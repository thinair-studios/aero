# Changelog

## 2.2.0 — 2026-11-20

Aero now covers things leaving as well as arriving.

- **Exits.** `aero-leave-*` (fade, up, down, left, right, scale, wipe) started by `.aero-out` or `Aero.leave(el, { remove })`.
- **Dialogs, drawers and popovers** that animate open and closed in pure CSS: `aero-dialog`, `aero-drawer` (`-left`, `-bottom`), `aero-popover`, backdrop included.
- **Page transitions.** `aero-pages.js` in `<head>` plus `data-aero-page="sheet"`: sheets slide in and away, sheets cross-fade between each other, the back button included; Firefox gets the same direction through page arrival.
- **Layout changes.** `Aero.swap(update)` with `.aero-morph`.
- **Text split** into words or letters (`aero-split`), and `aero-hover-wave`.
- **Attention** effects: `aero-shake`, `aero-pop`, `aero-spin`, `aero-pulse`, `aero-ping`, `aero-bounce`, `aero-float`.
- **Wipes**: `aero-wipe-right` / `-left` / `-up` / `-down` entrances, scrubbable too.
- **Numbers**: `aero-count` counts up to the number in its text.
- **`aero-draw`**: an SVG stroke drawing in, as an entrance or scrubbed; `aero.js` sets `pathLength="1"` on the shapes.
- **`aero-collapse`** (a `<details>` that opens and closes smoothly) and **`aero-flip`** (a two-faced card), in a new `disclosure` module.
- **`aero-marquee`** (a seamless loop; `aero-marquee-reverse`, `--aero-marquee-duration`) and **`aero-shimmer`** (a loading-skeleton sweep).
- **`aero-depth`**: scroll parallax, `aero-scrub aero-depth` with `--aero-depth`.
- **`aero-magnetic`**: a button leaning toward the pointer inside an `.aero-cursor` area.
- **`aero-underline`**: a link underline that draws in on hover and out on leave.
- **Real springs and bounce**: `aero-ease-spring` is now a `linear()` spring with a slight overshoot (old browsers keep the cubic-bezier), plus `aero-ease-spring-soft` and `aero-ease-bounce`.
- **Stagger order**: `data-aero-stagger-from="end" | "center" | "random"`.
- **Text lines**: `data-aero-split="lines"` reveals each rendered line from behind its own mask.
- **Fix:** the `aero.js` scroll fallback now works on SVG elements, which have no `offsetTop`.
- **Underline states**: `aero-underline` also draws while current (`.aero-on`, `aria-current`); `aero-underline-side` and `aero-underline-shown`; and `aero-hover-appear` for things that show on hover.
- **Scroll**: `aero-slide-left` / `-right` and `aero-fade-out` for scrubbed motion; `--aero-opacity-from` for any fade.
- **The edge**: `aero-edge`, `aero-edge-shift`, `-drift`, `-pin`, `-fade`: a panel at the left edge that opens as the mouse nears it. Only layers move while it opens. `--aero-edge` lives on the panel (not `<html>`), and aero.js writes `translate` on the shifted blocks while it is open.
- **Glide**: `aero-glide` flies from a measured spot through a waypoint into place (a logo from a hero into a header); fades can start hidden with `--aero-visibility-from`.
- **Collapse icon**: `aero-collapse-icon` turns when its details opens.
- **Fix:** `aero-flip` turns its faces, not the card, so a pointer near its edge no longer makes it flicker.
- **Fix:** line masks (`data-aero-split="lines"`) leave room for descenders (`--aero-line-bleed`, .25em above and below; the mask is now a clip-path, so a page reset can't undo it).
- **Attention, letter by letter**: on split text the attention effects stagger like entrances; `Aero.settle(el)` stops a loop at the end of its turn.
- **Hover, plus your own**: `--aero-hover-also` adds transitions next to the hover move instead of replacing it. The edge also stays shut while a popover is open.
- **Replay on scroll** with `aero-repeat`, events `aero:in` and `aero:done`, and `Aero.replay(el)`.

## 2.1.0 — 2026-11-19

- **Pinned scroll.** `.aero-track` on a tall wrapper and `.aero-scrub-track` on its (sticky) contents: they animate through the wrapper's progress, so they can stay pinned while they move. Ranges also accept `contain` now, in CSS and in the `aero.js` fallback.
- **Fix:** the `aero.js` scroll fallback now measures against the viewport minus the page's `scroll-padding`, like CSS view timelines do. Sites with a sticky header (and `scroll-padding-top`) were up to a few percent off in browsers without scroll timelines.

- Tests in Chromium, Firefox and WebKit (`npm test`), run on every push and pull request by GitHub Actions.
- A demo page for every module (`docs/index.html`).

## 2.0.0 — 2026-11-19

Aero is now open source (MIT) and split into modules.

- **Modules.** `src/` holds one file per area (core, entrances, scroll, hover, cursor, arrival, motion); `npm run build` makes `dist/aero.css`, `dist/aero.min.css` and one file per module, so you can import only what you use.
- **`@layer aero`.** Everything sits in one cascade layer: your own CSS wins without specificity games.
- **Two prefixes.** Every class works as `aero-…` or `ae-…`. State classes added by the runtime come in both.
- **One entrance system.** `.aero-enter` + a variant, triggered by `.aero-in`. The variants also drive `.aero-scrub`. The transition-based `.animate` entrances are gone.
- **Keyframes end on the element's own styles** (no lingering `transform: translate(0)`).
- **Stagger** with `.aero-stagger` on the parent; uses `sibling-index()` where available.
- **Hover** effects share one trigger; new `aero-hover-shift` (any move plus scale); no sticky hover on touch screens; keyboard focus moves things too.
- **Cursor** effects (`aero-tilt`, `aero-spotlight`, `aero-parallax`) driven by the runtime on `.aero-cursor`; no React hook needed. Fixes 1.x parallax layers resetting the values they should inherit.
- **Reduced motion** is an opt-in: `.aero-reduce-motion` on `<html>`.
- **Runtime** picks up elements added later on its own, ships as a script, an ES module (`aero-css/runtime`, safe to import during server rendering) and with TypeScript types.
- **Renamed** settings to `--aero-…` and keyframes to `aero-…`.
- **`legacy.css`** keeps the 1.x stylesheet, unchanged, for code not moved yet.

## 1.2.1

`hover-shift`, and no sticky hover on touch screens.

## 1.2.0

Scroll-linked animation (`.scrub`) with the `aero.js` runtime, grow / fan / lift / pass entrances, `hover-rise` and `hover-nudge`.

## 1.1.1

Renamed to Aero (package `aero-css`).

## 1.1.0

Horizontal keyframe entrances and page arrival, on top of the original Animate.css-lite.
