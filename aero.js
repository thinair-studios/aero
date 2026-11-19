/* Aero runtime (no dependencies). Load it once per page: <script src="aero.js" defer></script>
 *
 *  1. In view: adds .in-view to .animate and .kf-enter elements the first time they come into view,
 *     which starts their entrance (animations.css sections 1-6, 10 and 12).
 *  2. Scrub: in browsers without CSS scroll-driven animations (Firefox, Zen), drives every .scrub
 *     element's animation from the scroll position, reading the same --scrub-range the CSS uses
 *     (section 13). Where the browser does it natively, this part does nothing.
 *
 *  Aero.refresh() picks up elements added to the page later; Aero.progress(el) reports a .scrub
 *  element's position in its range (0 to 1), for debugging.
 */
(() => {
  const root = document.documentElement;
  const native = !!(window.CSS && CSS.supports("animation-timeline: view()"));

  // ---- 1. In view
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); }
      }, { threshold: 0.15 })
    : null;
  const watch = () => {
    for (const el of document.querySelectorAll(".animate:not(.in-view), .kf-enter:not(.in-view)")) {
      if (io) io.observe(el); else el.classList.add("in-view");
    }
  };

  // ---- 2. Scrub
  let scrubs = [], queued = false;
  const len = (v) => (v.endsWith("vh") ? (parseFloat(v) * innerHeight) / 100 : parseFloat(v) || 0);
  // Where the element's top edge sits in the viewport when a range point is reached
  // (same meaning as CSS view timelines: cover, entry, exit).
  const point = (name, pct, H, h) => {
    const f = pct / 100;
    if (name === "entry") return H - f * Math.min(h, H);
    if (name === "exit") { const start = Math.min(0, H - h); return start + f * (-h - start); }
    return H - f * (H + h); // cover
  };
  // Layout position, ignoring transforms (the animation's own transform must not move the measurement).
  const top = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y - scrollY; };

  // How far through its range the element is right now, 0 to 1.
  const progress = (el) => {
    const r = (getComputedStyle(el).getPropertyValue("--scrub-range").trim() || "entry 0% entry 80%").split(/\s+/);
    let p;
    if (el.classList.contains("scrub-root")) {
      const a = len(r[0] || "0"), b = len(r[1] || "100vh");
      p = (scrollY - a) / (b - a || 1);
    } else {
      const H = innerHeight, h = el.offsetHeight, t = top(el);
      const t0 = point(r[0], parseFloat(r[1]), H, h), t1 = point(r[2], parseFloat(r[3]), H, h);
      p = (t0 - t) / (t0 - t1 || 1);
    }
    return Math.min(1, Math.max(0, p));
  };

  const tick = () => {
    queued = false;
    for (const el of scrubs) {
      const anim = el.getAnimations().find((a) => a.animationName);
      if (anim) anim.currentTime = progress(el) * 1000; // .scrub animations last 1s
    }
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };

  const refresh = () => {
    watch();
    if (native) return;
    scrubs = [...document.querySelectorAll(".scrub")];
    if (scrubs.length) { root.classList.add("aero-scrub-js"); queue(); }
  };

  if (!native) {
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    addEventListener("load", queue);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh);
  else refresh();
  window.Aero = { refresh, progress };
})();
