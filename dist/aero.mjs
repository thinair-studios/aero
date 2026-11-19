/* Aero 2.1.0 — runtime, as an ES module. https://github.com/thinair-studios/aero (MIT) */
/* Aero runtime (no dependencies). Load it once per page: <script src="aero.js" defer></script>
 *
 *  1. In view: adds .aero-in (and .ae-in) to .aero-enter elements the first time they come into
 *     view, which starts their entrance.
 *  2. Scrub: in browsers without CSS scroll-driven animations, drives every .aero-scrub element's
 *     animation from the scroll position, reading the same --aero-scrub-range as the CSS.
 *     Where the browser does it natively, this part does nothing.
 *  3. Cursor: writes --aero-cursor-x / -y / -cx / -cy / -active on every .aero-cursor element.
 *
 *  Elements added later are picked up automatically. Every class works with the ae- prefix too.
 *  With .aero-reduce-motion on <html> and the visitor preferring reduced motion, nothing moves.
 *
 *  window.Aero.refresh()   re-scan now (normally not needed)
 *  window.Aero.progress(el) a scrubbed element's position in its range, 0 to 1 (for debugging)
 */
(() => {
  if (typeof window === "undefined") return; // imported during server rendering: nothing to do
  const root = document.documentElement;
  const $ = (names) => names.flatMap((n) => [`.aero-${n}`, `.ae-${n}`]).join(", ");
  const has = (el, name) => el.classList.contains(`aero-${name}`) || el.classList.contains(`ae-${name}`);
  const mark = (el, name) => el.classList.add(`aero-${name}`, `ae-${name}`);
  const still = () => has(root, "reduce-motion") && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const native = !!(window.CSS && CSS.supports("animation-timeline: view()"));

  // ---- 1. In view
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { mark(e.target, "in"); io.unobserve(e.target); }
      }, { threshold: 0.15 })
    : null;
  const seen = new WeakSet();
  const watch = () => {
    for (const el of document.querySelectorAll($(["enter"]))) {
      if (seen.has(el) || has(el, "in")) continue;
      seen.add(el);
      if (io && !still()) io.observe(el); else mark(el, "in");
    }
  };

  // ---- 2. Scrub
  let scrubs = [], queued = false;
  const len = (v) => (v.endsWith("vh") ? (parseFloat(v) * innerHeight) / 100 : parseFloat(v) || 0);
  // Where the element's top edge sits in the viewport when a range point is reached
  // (the same meaning as CSS view timelines: cover, contain, entry, exit).
  const point = (name, pct, H, h) => {
    const f = pct / 100;
    if (name === "entry") return H - f * Math.min(h, H);
    if (name === "contain") { const a = Math.max(H - h, 0), b = Math.min(H - h, 0); return a + f * (b - a); }
    if (name === "exit") { const start = Math.min(0, H - h); return start + f * (-h - start); }
    return H - f * (H + h); // cover
  };
  // Layout position, ignoring transforms (the animation's own transform must not move the measurement).
  const top = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y - scrollY; };

  const progress = (el) => {
    const raw = getComputedStyle(el).getPropertyValue("--aero-scrub-range").trim();
    let p;
    if (has(el, "scrub-root")) {
      const r = raw.split(/\s+/), end = root.scrollHeight - innerHeight;
      const a = raw ? len(r[0]) : 0, b = raw ? len(r[1] || "100vh") : end;
      p = (scrollY - a) / (b - a || 1);
    } else {
      // .aero-scrub-track measures its .aero-track wrapper, so pinned (sticky) children still move.
      const track = has(el, "scrub-track") && el.closest(".aero-track, .ae-track");
      const box = track || el;
      const r = (raw || (track ? "contain 0% contain 100%" : "entry 0% entry 80%")).split(/\s+/);
      // Like CSS view timelines, measure against the viewport minus the page's scroll-padding.
      const cs = getComputedStyle(root), pt = parseFloat(cs.scrollPaddingTop) || 0, pb = parseFloat(cs.scrollPaddingBottom) || 0;
      const H = innerHeight - pt - pb, h = box.offsetHeight, t = top(box) - pt;
      const t0 = point(r[0], parseFloat(r[1]), H, h), t1 = point(r[2], parseFloat(r[3]), H, h);
      p = (t0 - t) / (t0 - t1 || 1);
    }
    return Math.min(1, Math.max(0, p));
  };

  const tick = () => {
    queued = false;
    for (const el of scrubs) {
      const anim = el.getAnimations().find((a) => a.animationName);
      if (anim) anim.currentTime = progress(el) * 1000; // .aero-scrub animations last 1s
    }
  };
  const queue = () => { if (!queued && scrubs.length) { queued = true; requestAnimationFrame(tick); } };

  // ---- 3. Cursor
  const tracked = new WeakSet();
  const track = (el) => {
    tracked.add(el);
    const target = { x: 0.5, y: 0.5, a: 0 }, now = { x: 0.5, y: 0.5, a: 0 };
    let raf = 0;
    const write = () => {
      const s = el.style;
      s.setProperty("--aero-cursor-x", now.x.toFixed(4));
      s.setProperty("--aero-cursor-y", now.y.toFixed(4));
      s.setProperty("--aero-cursor-cx", (now.x * 2 - 1).toFixed(4));
      s.setProperty("--aero-cursor-cy", (now.y * 2 - 1).toFixed(4));
      s.setProperty("--aero-cursor-active", now.a.toFixed(3));
    };
    const step = () => {
      const lag = Math.min(Math.max(parseFloat(el.dataset.aeroSmoothing ?? "0.18"), 0), 0.95), k = 1 - lag;
      now.x += (target.x - now.x) * k; now.y += (target.y - now.y) * k; now.a += (target.a - now.a) * k;
      write();
      const done = Math.abs(target.x - now.x) < 5e-4 && Math.abs(target.y - now.y) < 5e-4 && Math.abs(target.a - now.a) < 5e-3;
      raf = done ? 0 : requestAnimationFrame(step);
    };
    const go = () => { if (!raf && !still()) raf = requestAnimationFrame(step); };
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      target.x = (e.clientX - r.left) / r.width; target.y = (e.clientY - r.top) / r.height; target.a = 1; go();
    });
    el.addEventListener("pointerenter", () => { target.a = 1; go(); });
    el.addEventListener("pointerleave", () => { target.x = 0.5; target.y = 0.5; target.a = 0; go(); });
    write();
  };

  // ---- Wiring
  const refresh = () => {
    watch();
    for (const el of document.querySelectorAll($(["cursor"]))) if (!tracked.has(el)) track(el);
    if (native || still()) return;
    scrubs = [...document.querySelectorAll($(["scrub"]))];
    if (scrubs.length) { mark(root, "scrub-js"); queue(); }
  };
  let pending = false;
  const later = () => { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; refresh(); }); } };

  if (!native) {
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    addEventListener("load", queue);
  }
  const start = () => {
    refresh();
    new MutationObserver((list) => { if (list.some((m) => m.addedNodes.length)) later(); })
      .observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
  window.Aero = { refresh, progress };
})();

const Aero = typeof window !== "undefined" ? window.Aero : { refresh() {}, progress() { return 0; } };
export const { refresh, progress } = Aero;
export default Aero;
