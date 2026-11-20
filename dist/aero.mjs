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
 *  7. Stagger order: data-aero-stagger-from="end" | "center" | "random" on .aero-stagger sets
 *     --aero-i on its children in that order (the default, from the start, stays CSS). Set again
 *     when the number of children changes.
 *  8. Lines: data-aero-split="lines" on .aero-split wraps each rendered line in .aero-line, with
 *     the entrance on a piece inside it. Re-split on resize until it has played.
 *  9. Draw: sets pathLength="1" on the shapes in .aero-draw if missing.
 * 10. Marquee: duplicates the children of .aero-marquee's track once (aria-hidden, inert) so the
 *     loop is seamless.
 *
 * 11. Edge: with an .aero-edge on the page, the pointer nearing the left edge eases --aero-edge
 *     from 0 to 1 on <html> (pages.css). Mouse only.
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
  const splits = new WeakSet(), lineEls = [], lineSrc = new WeakMap();
  const noId = (n) => { n.removeAttribute("id"); n.querySelectorAll("[id]").forEach((x) => x.removeAttribute("id")); return n; };
  // Lines: split into words, group them by rendered line (offsetTop), then wrap each line in a
  // clipping .aero-line with one piece inside it. Inline markup is kept by cloning its tags per line.
  const splitLines = (el, html, cls, text) => {
    lineSrc.set(el, [html, cls, text]);
    el.innerHTML = html;
    const words = [];
    const walk = (node, chain) => {
      for (const n of [...node.childNodes]) {
        if (n.nodeType === 1) { walk(n, [...chain, n]); continue; }
        if (n.nodeType !== 3 || !n.data.trim()) continue;
        const frag = document.createDocumentFragment();
        for (const part of n.data.split(/(\s+)/)) {
          if (!part) continue;
          if (!part.trim()) { frag.append(" "); continue; }
          const w = document.createElement("span");
          w.style.display = "inline-block";
          w.textContent = part;
          words.push({ w, part, chain });
          frag.append(w);
        }
        n.replaceWith(frag);
      }
    };
    walk(el, []);
    const groups = [];
    let last;
    for (const o of words) {
      const t = o.w.offsetTop;
      if (!last || t >= last.top + o.w.offsetHeight * 0.5) groups.push(last = { top: t, words: [] });
      last.words.push(o);
    }
    el.textContent = "";
    groups.forEach((g, i) => {
      const line = document.createElement("span"), p = document.createElement("span");
      line.className = "aero-line";
      line.setAttribute("aria-hidden", "true");
      p.className = cls.join(" ");
      p.style.setProperty("--aero-i", i);
      let key, box;
      g.words.forEach((o, k) => {
        const tag = o.chain[o.chain.length - 1];
        if (tag && tag === key) { box.append(" " + o.part); return; } // same tag as the word before
        if (k) p.append(" ");
        key = tag;
        if (!tag) { box = null; p.append(o.part); return; }
        let outer;
        box = null;
        for (const a of o.chain) { const c = noId(a.cloneNode(false)); if (box) box.append(c); else outer = c; box = c; }
        box.append(o.part);
        p.append(outer);
      });
      line.append(p);
      el.append(line);
    });
    const sr = document.createElement("span");
    sr.className = "aero-split-text";
    sr.textContent = text;
    el.append(sr);
  };
  // After a resize or font load, split again, but only while nothing has played yet.
  let resizeTimer = 0;
  const resplit = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      let again = false;
      for (const el of lineEls) {
        if (!el.isConnected || el.querySelector(".aero-piece.aero-in")) continue;
        splitLines(el, ...lineSrc.get(el));
        again = true;
      }
      if (again) refresh();
    }, 150);
  };
  addEventListener("resize", resplit);
  if (document.fonts) document.fonts.ready.then(resplit);
  const split = (el) => {
    if (splits.has(el)) return;
    splits.add(el);
    const lines = el.dataset.aeroSplit === "lines", letters = el.dataset.aeroSplit === "letters";
    const variants = [...el.classList].filter((c) => /^(aero|ae)-((fade|scale|grow|wipe)-[a-z]+|repeat)$/.test(c));
    const cls = variants.some((c) => !c.endsWith("repeat")) ? ["aero-piece", "aero-enter", ...variants] : ["aero-piece"];
    const text = el.textContent.replace(/\s+/g, " ").trim();
    if (lines) { splitLines(el, el.innerHTML, cls, text); lineEls.push(el); return; }
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

  // ---- Edge: the pointer nearing the left edge eases --aero-edge (0..1) on <html>, while an .aero-edge is on the page
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  let edgeWant = 0, edgeNow = 0, edgeRaf = 0;
  const edgeStep = () => {
    edgeNow += (edgeWant - edgeNow) * 0.16;
    if (Math.abs(edgeWant - edgeNow) < 0.001) edgeNow = edgeWant;
    root.style.setProperty("--aero-edge", edgeNow.toFixed(4));
    root.classList.toggle("aero-edge-on", edgeNow > 0.001);
    root.classList.toggle("ae-edge-on", edgeNow > 0.001);
    for (const p of document.querySelectorAll($(["edge"]))) { p.classList.toggle("aero-edge-live", edgeNow > 0.04); p.classList.toggle("ae-edge-live", edgeNow > 0.04); }
    edgeRaf = edgeNow === edgeWant ? 0 : requestAnimationFrame(edgeStep);
  };
  const openPopover = () => { try { return document.querySelector(":popover-open"); } catch { return null; } };
  const edgeTo = (v) => { edgeWant = v; if (!edgeRaf) edgeRaf = requestAnimationFrame(edgeStep); };
  addEventListener("pointermove", (e) => {
    const panel = document.querySelector($(["edge"]));
    if (!panel || !fine.matches || e.pointerType !== "mouse" || still()) return;
    const busy = e.buttons || document.querySelector("dialog[open]") || openPopover() || (window.getSelection && String(getSelection()));
    const zone = parseFloat(getComputedStyle(panel).getPropertyValue("--aero-edge-zone")) || 220;
    const k = busy ? 0 : Math.max(0, 1 - e.clientX / zone);
    edgeTo(k * k * (3 - 2 * k)); // gentle at first, decisive near the edge
  }, { passive: true });
  root.addEventListener("pointerleave", () => edgeTo(0));
  addEventListener("blur", () => edgeTo(0));
  addEventListener("pageshow", () => { edgeWant = edgeNow = 0; root.style.setProperty("--aero-edge", "0"); root.classList.remove("aero-edge-on", "ae-edge-on"); });

  // ---- Stagger order, draw, marquee
  const SHAPES = "path, line, polyline, polygon, circle, ellipse, rect";
  const ordered = new WeakMap(), looped = new WeakSet(); // stagger -> what it was ordered for
  const order = (el) => {
    const from = el.dataset.aeroStaggerFrom, kids = [...el.children], n = kids.length;
    if (!from) { // the attribute was removed: back to the default order
      if (ordered.has(el)) { ordered.delete(el); kids.forEach((k) => k.style.removeProperty("--aero-i")); }
      return;
    }
    if (ordered.get(el) === from + n) return; // the same children: keep the order (random stays put)
    ordered.set(el, from + n);
    const pos = kids.map((_, i) => i);
    if (from === "random") for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pos[i], pos[j]] = [pos[j], pos[i]]; }
    kids.forEach((k, i) => k.style.setProperty("--aero-i", from === "end" ? n - 1 - i : from === "center" ? Math.abs(i - (n - 1) / 2) : pos[i]));
  };
  const prepare = () => {
    for (const el of document.querySelectorAll($(["stagger"]))) order(el);
    for (const el of document.querySelectorAll($(["draw"]))) {
      for (const sh of el.matches(SHAPES) ? [el] : el.querySelectorAll(SHAPES)) if (!sh.hasAttribute("pathLength")) sh.setAttribute("pathLength", "1");
    }
    for (const el of document.querySelectorAll($(["marquee"]))) {
      const track = el.firstElementChild;
      if (!track || looped.has(el)) continue;
      looped.add(el);
      for (const c of [...track.children]) {
        const copy = noId(c.cloneNode(true));
        copy.setAttribute("aria-hidden", "true");
        copy.setAttribute("inert", "");
        track.append(copy);
      }
    }
  };

  const seen = new WeakSet();
  const watch = () => {
    prepare();
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
  const top = (el) => { if (el.offsetTop === undefined) return el.getBoundingClientRect().top; let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y - scrollY; };

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
      const r = (raw || (track ? "contain 0% contain 100%" : has(el, "depth") ? "cover 0% cover 100%" : "entry 0% entry 80%")).split(/\s+/);
      // Like CSS view timelines, measure against the viewport minus the page's scroll-padding.
      const cs = getComputedStyle(root), pt = parseFloat(cs.scrollPaddingTop) || 0, pb = parseFloat(cs.scrollPaddingBottom) || 0;
      const H = innerHeight - pt - pb, h = box.offsetHeight ?? box.getBoundingClientRect().height, t = top(box) - pt;
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
      // A magnetic element moves toward the pointer; measure from where it rests, or it chases itself and jitters.
      let left = r.left, topY = r.top;
      if (has(el, "magnetic")) {
        const [tx, ty] = getComputedStyle(el).translate.split(" ").map(parseFloat);
        left -= tx || 0; topY -= ty || 0;
      }
      target.x = (e.clientX - left) / r.width; target.y = (e.clientY - topY) / r.height; target.a = 1; go();
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
