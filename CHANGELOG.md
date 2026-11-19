# Changelog

## Unreleased

- Tests in Chromium, Firefox and WebKit (`npm test`).
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
