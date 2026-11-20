# Aero

A small animation library in CSS (about 5 KB gzipped), with an optional 7 KB script. Entrances, scroll-linked animation, hover and cursor effects, and page arrival, that look the same in every modern browser.

Aero is small, and it grows every day: it covers what our own sites need and gets a new effect whenever a project asks for one. If it's missing something you need, [add it](CONTRIBUTING.md).

- **CSS first.** Add a class, get the motion. Settings are custom properties with sensible defaults.
- **Scroll-linked everywhere.** Native CSS scroll timelines where the browser has them; where it doesn't, `aero.js` drives the very same animation, so it moves identically.
- **Never in your way.** Everything sits in `@layer aero`, so your own CSS always wins.
- **Comes and goes.** Entrances, exits, dialogs and drawers that open and close, page transitions, text split into words or letters, counters and attention effects.
- **Pick a prefix.** Every class works as `aero-…` or the short `ae-…`.
- **Motion by default, reduced motion on request.** See [Reduced motion](#reduced-motion).

Not on npm yet. Install it from GitHub, pinned to a release tag (a plain HTTPS download, so build machines need no git or SSH):

```sh
npm i https://github.com/thinair-studios/aero/archive/refs/tags/v2.2.0.tar.gz
```

```css
@import "aero-css";            /* everything (dist/aero.css) */
@import "aero-css/hover.css";  /* or just the modules you use */
```

```html
<script src="node_modules/aero-css/dist/aero.js" defer></script>
<!-- or: import "aero-css/runtime" in a bundler -->
```

The script is needed for in-view entrances, the scroll fallback, cursor effects, text split, counters, the marquee, stagger order, `aero-draw`'s `pathLength` and `Aero.leave`/`replay`/`swap`. Hovers, attention effects, collapse, flip and dialogs are CSS only. Page transitions use their own small script, `aero-pages.js`, in `<head>` (see [Between pages](#between-pages)).

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
Presets: `aero-fast` `aero-slow` `aero-slower`, `aero-ease-expo` `-quart` `-back` `-spring` `-spring-soft` `-bounce`. The spring (a slight overshoot), the soft spring and the bounce are real curves (CSS `linear()`); browsers too old for `linear()` get a smooth cubic-bezier.

`aero-draw` draws an SVG stroke in, on a shape or on the whole `<svg>`:

```html
<svg class="aero-enter aero-draw" fill="none" stroke="currentColor" stroke-width="4">
  <path d="M8 70 C 50 10, 90 10, 130 70"/>
</svg>
```

It animates `stroke-dasharray` and `stroke-dashoffset` (an exception to the transform-and-opacity rule) and needs `pathLength="1"` on the shapes: `aero.js` sets it where it is missing. It also works with `aero-scrub`. Duration from `--aero-duration`.

Stagger order: `data-aero-stagger-from="end"`, `"center"` or `"random"` on an `.aero-stagger` parent changes who goes first (the default is the first child). `aero.js` sets `--aero-i` on the children, and sets it again when you add some.

## Scroll-linked (scrub)

```html
<h2 class="aero-scrub aero-fade-up" style="--aero-scrub-range: entry 0% entry 80%">Follows the scroll</h2>
<li class="aero-scrub aero-pass" style="--aero-scrub-range: cover 0% cover 100%">Arrives, holds, steps back</li>
<svg class="aero-scrub aero-scrub-root" style="animation-name: my-glide; --aero-scrub-range: 0px 600px">…</svg>
```

Any entrance variant works, or your own `animation-name`. `--aero-scrub-range` reads like `animation-range` (`cover`, `contain`, `entry`, `exit` with percentages); with `.aero-scrub-root` the animation follows the page scroll and the range is two lengths.

`aero-depth` is scroll parallax: write `aero-scrub aero-depth` and the element moves against the scroll as it passes, from `--aero-depth` (80px, negative allowed) below its place to the same distance above it. The range defaults to `cover 0% cover 100%`; it uses the individual `translate` property.

```html
<img class="aero-scrub aero-depth" style="--aero-depth: -60px" src="…">
```

To pin something while it animates, give a tall wrapper `.aero-track`, make its contents sticky, and add `.aero-scrub-track`: they follow the wrapper's progress instead of their own (by default from the wrapper filling the screen to it starting to leave).

```html
<section class="aero-track" style="height: 250vh">
  <div style="position: sticky; top: 0">
    <img class="aero-scrub aero-scrub-track aero-fan-left" src="…">
  </div>
</section>
```

## Exits

```html
<li class="aero-leave-right">…</li>
<script>Aero.leave(item, { remove: true });  // plays the exit, then removes it</script>
```

`aero-leave-fade`, `aero-leave-up` / `-down` / `-left` / `-right`, `aero-leave-scale`, `aero-leave-wipe-right` / `-left`. `.aero-out` starts it (`Aero.leave` adds it for you and resolves when it ends). Settings: `--aero-leave-duration` (0.35s) `--aero-leave-easing` `--aero-distance`.

## Dialogs, drawers and popovers

```html
<dialog class="aero-dialog">…</dialog>      <!-- showModal() / close() -->
<dialog class="aero-drawer">…</dialog>      <!-- from the right; -left, -bottom -->
<div popover class="aero-popover">…</div>
```

Pure CSS: they animate in when they open and out when they close, backdrop included. Aero only moves them; size and position stay yours. Opening animates everywhere; closing animates in Chrome and Edge, while Firefox and Safari close a modal at once for now. Settings: `--aero-duration` `--aero-easing` `--aero-backdrop`.

## Attention

```html
<input class="aero-shake">                  <!-- once; Aero.replay(input) to shake again -->
<span class="aero-spin">…</span>             <!-- loops -->
```

Once: `aero-shake`, `aero-pop`. Loops: `aero-spin`, `aero-pulse`, `aero-ping`, `aero-bounce`, `aero-float`, `aero-shimmer`. Settings: `--aero-attention-duration` `--aero-shake` `--aero-pop`.

`aero-shimmer` sweeps a light band across a loading skeleton (a `::after` that moves with `translateX`, clipped by the element). Settings: `--aero-shimmer-color` (`rgb(255 255 255 / .35)`) and `--aero-attention-duration` (1.6s here).

```html
<div class="skeleton aero-shimmer"></div>
```

`aero-marquee` is a continuous, seamless loop. The container's single child is the track:

```html
<div class="aero-marquee" style="--aero-marquee-duration: 20s">
  <div><span style="padding-right: 32px">One</span><span style="padding-right: 32px">Two</span>…</div>
</div>
```

The track scrolls left forever. `aero.js` copies its children once (the copies are `aria-hidden` and `inert`, and lose any `id`), so the items together should be wider than the container, and spaced with margin or padding, not `gap`. Hovering or focusing inside pauses it; `aero-marquee-reverse` goes the other way. Setting: `--aero-marquee-duration` (30s for one full loop). Children added later are not copied.

## Disclosure

```html
<details class="aero-collapse"><summary>Question</summary>Answer</details>

<div class="aero-flip">
  <div class="aero-front">…</div>
  <div class="aero-back">…</div>
</div>
```

`aero-collapse` on a `<details>` opens and closes its content with a block-size transition. It sets `interpolate-size` on the element itself, never on `:root`. Where the browser has no `::details-content` or `interpolate-size` (Firefox and Safari today) it just opens at once. Settings: `--aero-duration` `--aero-easing`.

`aero-flip` is a card with two faces: `.aero-front` sets the size, `.aero-back` is laid over it. Hover, focus inside, or the class `aero-flipped` (add it to flip on click) turns it 180deg around the vertical axis. On touch screens hover alone does not flip it. Settings: `--aero-flip-duration` (0.6s) `--aero-flip-perspective` (900px) `--aero-hover-easing`.

## Text

```html
<h2 class="aero-split aero-fade-up">Words, one after another</h2>
<h2 class="aero-split aero-wipe-up" data-aero-split="letters">Letters</h2>
<a class="aero-split aero-hover-wave" data-aero-split="letters">A wave on hover</a>
```

`aero.js` splits the text into words (or letters, kept inside their words) and each piece plays the parent's variant. Inline markup stays, and screen readers get letter-split text once, whole. Settings: `--aero-stagger` (45ms here) `--aero-wave`.

`data-aero-split="lines"` gives each rendered line its own mask (`.aero-line`, `overflow: clip`) and plays the variant on a piece inside it, so each line rises from behind its own edge. Use `aero-fade-up` with `--aero-distance: 100%`:

```html
<h2 class="aero-split aero-fade-up" data-aero-split="lines" style="--aero-distance: 100%">A long headline that wraps</h2>
```

It splits again on resize (and when fonts load) until the text has played, then leaves it. Inline tags are kept, cloned for each line they wrap onto. Keep `line-height` at 1.1 or more so the mask doesn't clip letters.

## Numbers

```html
<span class="aero-count">€1,250+</span>
```

Counts up from zero to the number in its text when it comes into view, then ends on the exact original text. Duration from `--aero-duration` (1.4s).

## Replay on scroll, and events

Add `aero-repeat` to an `.aero-enter` (or `.aero-count`) and it plays again every time it comes back into view. Entrances send `aero:in` when they start and `aero:done` when they end; both bubble.

## Hover

```html
<a class="aero-hover-lift">Lifts 16px</a>
<li class="aero-hover-group">                   <!-- hover or focus anywhere in the group -->
  <img class="aero-hover-target aero-hover-rise">  <!-- lifts 6px and grows 3% -->
</li>
```

Effects: `aero-hover-lift` (`-sm` `-md` `-lg` `-xl`), `aero-hover-scale` (`-sm` `-md` `-lg`), `aero-hover-rise`, `aero-hover-nudge`, `aero-hover-shift`.
Settings: `--aero-hover-duration` `--aero-hover-easing` `--aero-hover-distance` `--aero-hover-scale` `--aero-hover-nudge` `--aero-hover-x` `--aero-hover-y`.
`aero-underline` on a link draws an underline in from the left on hover or focus, and out to the right when you leave. It replaces the link's own underline. Settings: `--aero-underline-color` (`currentColor`) `--aero-underline-thickness` (2px) `--aero-underline-offset` (0.15em).
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

`aero-magnetic` makes a button or link lean toward the pointer by up to `--aero-magnetic` (10px) and rest centred. Put it inside an `.aero-cursor` area, or on the `.aero-cursor` element itself:

```html
<div class="aero-cursor"><button class="aero-magnetic">Get started</button></div>
<button class="aero-cursor aero-magnetic">Its own area</button>
```

## Between pages

```css
@view-transition { navigation: auto; }
```
```html
<html data-aero-page="sheet">                    <!-- on pages that sit on top of others -->
<script src="node_modules/aero-css/dist/aero-pages.js"></script>   <!-- in <head>, not deferred -->
```

Going to a sheet page, it slides in from the right over the last one; leaving it for a page underneath, it slides away again; between two sheets there's a quick cross-fade. The back and forward buttons work the same way. Settings (on `:root`): `--aero-page-duration` `--aero-page-easing` `--aero-page-fade`.

Browsers without cross-document View Transitions (Firefox today) get the same direction from page arrival: `aero-pages.js` adds `aero-arrive` plus `aero-from-right` or `aero-from-left` to `<html>`, and `<main>` slides in once.

## Layout changes

```js
Aero.swap(() => list.prepend(item));   // .aero-morph elements move to their new places
```

A View Transition within the page; where there isn't one, it just updates. Settings (on `:root`): `--aero-morph-duration` `--aero-morph-easing`.

## Reduced motion

Motion plays by default, even when the visitor has turned on "Reduce motion": many people use that setting to calm the operating system, not to switch off a site's motion. To respect it, add `aero-reduce-motion` to `<html>`. Visitors who prefer reduced motion then see everything at once and still (collapse and flip happen at once, the marquee and shimmer stop), and `aero.js` stops driving anything.

## Runtime API

```js
import Aero, { refresh, progress, replay, leave, swap } from "aero-css/runtime";
refresh();               // re-scan now; new elements are picked up automatically anyway
progress(el);            // a scrubbed element's position in its range, 0 to 1
replay(el);              // play the entrances and once-effects in el again
await leave(el, { remove: true });   // play its exit, then remove it
await swap(() => …);     // change the layout; .aero-morph elements move to their new places
```

## Upgrading from 1.x

2.0 renames everything to the `aero-` / `ae-` prefix (`.kf-enter` → `.aero-enter`, `.scrub` → `.aero-scrub`, `.hover-rise` → `.aero-hover-rise`, `--animate-distance` → `--aero-distance`, `kf-fade-up` → `aero-fade-up`, `.in-view` → `.aero-in`) and drops the transition-based `.animate` entrances in favour of `.aero-enter`. The 1.x stylesheet ships unchanged as `aero-css/legacy.css` for code you haven't moved yet. See [CHANGELOG.md](CHANGELOG.md).

## Demo and tests

See every module live at **https://aero.thinairstudios.dev** (`docs/index.html`; locally, serve the repo root with any static server and open `/docs/`). `npm test` checks that `dist/` is current and runs the test suite in Chromium, Firefox and WebKit.

## Contributing

New effects are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

MIT © Rijad Rajkić
