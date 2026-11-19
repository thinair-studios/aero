/* Aero 2.2.0 — runtime, as an ES module. https://github.com/thinair-studios/aero (MIT) */
/* Aero runtime (no dependencies). Load it once per page: <script src="aero.js" defer></script>
 *
 *  1. In view: adds .aero-in (and .ae-in) to .aero-enter elements the first time they come into
 *     view, which starts their entrance.
 *  2. Scrub: in browsers without CSS scroll-driven animations, drives every .aero-scrub element's
 *     animation from the scroll position, reading the same --aero-scrub-range as the CSS.
 *     Where the browser does it natively, this part does nothing.
 *  3. Cursor: writes --aero-cursor-x / -y / -cx / -cy / -active on every .aero-cursor element.
 *  4. Text: splits .aero-split elements into words or letters (see text.css).
 *  5. Numbers: .aero-count counts up to the number in its text when it comes into view.
 *  6. Repeat: .aero-enter.aero-repeat plays again each time it comes back into view.
 *
 *  Events (they bubble): "aero:in" when an entrance starts, "aero:done" when it ends.
 *  Elements added later are picked up automatically. Every class works with the ae- prefix too.
 *  With .aero-reduce-motion on <html> and the visitor preferring reduced motion, nothing moves.
 *
 *  window.Aero.refresh()   re-scan now (normally not needed)
 *  window.Aero.progress(el) a scrubbed element's position in its range, 0 to 1 (for debugging)
 *  window.Aero.replay(el)   play the entrances and once-effects in el again, from the start
 *  window.Aero.leave(el, { remove })  play el's .aero-leave-* exit; resolves when it ends
 *  window.Aero.swap(update) change the layout inside update(); .aero-morph elements move to
 *                           their new places (a View Transition; elsewhere it just updates)
 */
(() => {
  if (typeof window === "undefined") return; // imported during server rendering: nothing to do
  const root = document.documentElement;
  const $ = (names) => names.flatMap((n) => [`.aero-${n}`, `.ae-${n}`]).join(", ");
  const has = (el, name) => el.classList.contains(`aero-${name}`) || el.classList.contains(`ae-${name}`);
  const mark = (el, name) => el.classList.add(`aero-${name}`, `ae-${name}`);
  const still = () => has(root, "reduce-motion") && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const native = !!(window.CSS && CSS.supports("animation-timeline: view()"));

  // ---- 1. In view, numbers and repeats
  const enter = (el) => { mark(el, "in"); el.dispatchEvent(new CustomEvent("aero:in", { bubbles: true })); };
  const counts = new WeakMap(); // .aero-count element -> its number, parsed from its text
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target;
          io.unobserve(el);
          if (has(el, "enter")) enter(el);
          if (counts.has(el)) count(el);
          if (has(el, "repeat")) gone.observe(el);
        }
      }, { threshold: 0.15 })
    : null;
  // A repeating element that has fully left the screen is reset, to play again when it's back.
  const gone = io && new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) continue;
      const el = e.target;
      gone.unobserve(el);
      el.classList.remove("aero-in", "ae-in");
      if (counts.has(el)) write(el, 0);
      io.observe(el);
    }
  }, { threshold: 0 });

  const NUM = /-?[0-9][0-9,]*(?:[.][0-9]+)?/;
  const write = (el, v) => {
    const n = counts.get(el);
    n.node.data = n.before + v.toLocaleString("en-US", { minimumFractionDigits: n.dec, maximumFractionDigits: n.dec, useGrouping: n.group }) + n.after;
  };
  const prime = (el) => {
    const text = el.textContent, m = text.match(NUM);
    if (!m) return false;
    el.textContent = text; // one text node, so counting changes its data rather than adding nodes
    const raw = m[0];
    counts.set(el, { node: el.firstChild, text, before: text.slice(0, m.index), after: text.slice(m.index + raw.length),
      to: parseFloat(raw.replace(/,/g, "")), dec: (raw.split(".")[1] || "").length, group: raw.includes(",") });
    write(el, 0);
    return true;
  };
  const seconds = (el, fallback) => {
    const v = getComputedStyle(el).getPropertyValue("--aero-duration").trim();
    return v ? parseFloat(v) * (v.endsWith("ms") ? 0.001 : 1) : fallback;
  };
  const count = (el) => {
    const n = counts.get(el), ms = seconds(el, 1.4) * 1000, t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      if (k < 1) { write(el, n.to * (1 - Math.pow(1 - k, 3))); requestAnimationFrame(step); }
      else n.node.data = n.text; // end on the exact original text
    };
    requestAnimationFrame(step);
  };

  // ---- Text split: words, or letters kept inside their words; each piece plays the parent's variant.
  const splits = new WeakSet();
  const split = (el) => {
    if (splits.has(el)) return;
    splits.add(el);
    const letters = el.dataset.aeroSplit === "letters";
    const variants = [...el.classList].filter((c) => /^(aero|ae)-((fade|scale|grow|wipe)-[a-z]+|repeat)$/.test(c));
    const cls = variants.some((c) => !c.endsWith("repeat")) ? ["aero-piece", "aero-enter", ...variants] : ["aero-piece"];
    const text = el.textContent.replace(/\s+/g, " ").trim();
    let i = 0;
    const piece = (str) => {
      const p = document.createElement("span");
      p.className = cls.join(" ");
      p.style.setProperty("--aero-i", i++);
      p.textContent = str;
      return p;
    };
    const walk = (node) => {
      for (const n of [...node.childNodes]) {
        if (n.nodeType === 1) { walk(n); continue; }
        if (n.nodeType !== 3 || !n.data.trim()) continue;
        const frag = document.createDocumentFragment();
        for (const part of n.data.split(/(\s+)/)) {
          if (!part) continue;
          if (!part.trim()) { frag.append(" "); continue; }
          if (!letters) { frag.append(piece(part)); continue; }
          const word = document.createElement("span");
          word.className = "aero-word";
          word.setAttribute("aria-hidden", "true");
          for (const ch of part) word.append(piece(ch));
          frag.append(word);
        }
        n.replaceWith(frag);
      }
    };
    walk(el);
    if (letters) { // letters read badly one by one: screen readers get the text once instead
      const sr = document.createElement("span");
      sr.className = "aero-split-text";
      sr.textContent = text;
      el.append(sr);
    }
  };

  const seen = new WeakSet();
  const watch = () => {
    for (const el of document.querySelectorAll($(["split"]))) split(el);
    for (const el of document.querySelectorAll($(["enter", "count"]))) {
      if (seen.has(el) || has(el, "in")) continue;
      seen.add(el);
      const isCount = has(el, "count") && !still() && io && prime(el);
      if (io && !still()) io.observe(el);
      else if (has(el, "enter")) mark(el, "in");
      if (!isCount) counts.delete(el);
    }
  };

  // "aero:done" when an entrance ends.
  document.addEventListener("animationend", (e) => {
    const t = e.target;
    if (t.classList && has(t, "enter") && e.animationName.startsWith("aero-") && !e.animationName.startsWith("aero-leave")) {
      t.dispatchEvent(new CustomEvent("aero:done", { bubbles: true }));
    }
  });

  // ---- Replay, leave, swap
  const replay = (el) => {
    for (const x of [el, ...el.querySelectorAll($(["enter"]))]) if (has(x, "enter") && !has(x, "in")) enter(x);
    for (const a of el.getAnimations({ subtree: true })) {
      const t = a.effect && a.effect.target;
      if (!a.animationName || !a.animationName.startsWith("aero-") || a.timeline !== document.timeline || (t && has(t, "scrub"))) continue;
      a.cancel(); a.play();
    }
  };
  const leave = (el, { remove = false } = {}) => new Promise((resolve) => {
    let over = false, timer = 0;
    const done = () => {
      if (over) return;
      over = true;
      clearTimeout(timer);
      el.removeEventListener("animationend", end);
      if (remove) el.remove();
      resolve(el);
    };
    const end = (e) => { if (e.target === el && e.animationName.startsWith("aero-leave")) done(); };
    el.addEventListener("animationend", end);
    mark(el, "out");
    // No exit running (no .aero-leave-* class, or reduced motion): done at once; otherwise a safety net.
    const anim = el.getAnimations().find((a) => a.animationName && a.animationName.startsWith("aero-leave"));
    timer = setTimeout(done, anim ? anim.effect.getComputedTiming().endTime + 100 : 0);
  });
  const swap = (update, types) => {
    if (!document.startViewTransition || still()) { update(); return Promise.resolve(); }
    // Where view-transition-name: match-element isn't supported, name each morphing element ourselves.
    if (!CSS.supports("view-transition-name", "match-element")) {
      document.querySelectorAll($(["morph"])).forEach((m, i) => { if (!m.style.viewTransitionName) m.style.viewTransitionName = `aero-morph-${i}`; });
    }
    let vt;
    try { vt = document.startViewTransition({ update, types }); } catch { vt = document.startViewTransition(update); }
    return vt.finished;
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
  window.Aero = { refresh, progress, replay, leave, swap };
})();

const Aero = typeof window !== "undefined" ? window.Aero : { refresh() {}, progress() { return 0; }, replay() {}, leave(el) { return Promise.resolve(el); }, swap(update) { update(); return Promise.resolve(); } };
export const { refresh, progress, replay, leave, swap } = Aero;
export default Aero;
