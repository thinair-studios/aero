/* Aero 2.2.0 — page transitions, for <head>. https://github.com/thinair-studios/aero (MIT) */
/* Aero page transitions. Load it in <head> on every page, not deferred (it must run before the
 * page is first shown), or inline its text in a <script> there. (This file never closes a
 * script tag in its text, so it is safe to inline.)
 *
 * Mark the pages that sit on top of others with <html data-aero-page="sheet">; every other page
 * is a base page. Each navigation is then tagged for pages.css:
 *   base -> sheet   aero-sheet       the sheet slides in from the right
 *   sheet -> base   aero-sheet-back  the sheet slides away to the right
 *   sheet -> sheet  aero-fade        a quick cross-fade
 * A link can ask for its own: <a data-aero-transition="reveal"> opens the next page as a circle
 * growing out of the point you clicked (aero-reveal), and going back to where you came from
 * closes it into that same point (aero-reveal-back).
 * A script that navigates without a link (history.back(), say) can name the transition first:
 *   dispatchEvent(new CustomEvent("aero:transition", { detail: "sheet" }))
 * "sheet" uses the page kinds as above, skipping any reveal-back; "reveal" needs a link and a point.
 * When a gesture has already moved the page aside (Aero's edge, a swipe), say how far, and the sheet carries on from
 * there instead of jumping back first:  { detail: { name: "sheet", offset: "320px" } }
 * The back and forward buttons work the same way. Browsers without cross-document View
 * Transitions get a matching arrival instead (arrival.css).
 */
(() => {
  // Inside a frame (a page previewing another one) there's no navigation of ours to tag or record.
  if (window.top !== window) return;
  const root = document.documentElement, KEY = "aero-page-from", OPENED = "aero-page-opened:";
  const kind = () => (root.dataset.aeroPage === "sheet" ? "sheet" : "base");
  const still = () => root.classList.contains("aero-reduce-motion") && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const page = (url) => String(url).split("#")[0];
  const load = (k) => { try { return JSON.parse(sessionStorage.getItem(k) || "null"); } catch { return null; } };
  const save = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} };

  // A click on a link with data-aero-transition: remember the transition and where it happened
  // (the link's centre when it was opened from the keyboard).
  let via = null;
  addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[data-aero-transition]");
    if (!a) { via = null; return; }
    const r = a.getBoundingClientRect(), key = e.detail === 0;
    via = { name: a.dataset.aeroTransition, href: page(a.href), from: page(location.href),
      x: key ? r.left + r.width / 2 : e.clientX, y: key ? r.top + r.height / 2 : e.clientY, w: innerWidth, h: innerHeight };
  }, true);
  addEventListener("aero:transition", (e) => {
    const d = e.detail || "sheet";
    via = { name: String(d.name || d), from: page(location.href), offset: d.offset ? String(d.offset) : undefined };
  });

  // Leaving: remember what kind of page this was, how it was opened, and the link that was used.
  // pageswap runs before the next page starts; pagehide covers browsers without it.
  const leaving = () => save(KEY, { kind: kind(), url: page(location.href), t: Date.now(), via, opened: load(OPENED + location.pathname) });
  addEventListener("pageswap", leaving);
  addEventListener("pagehide", leaving);

  // The reveal's circle: centre and radius (to the farthest corner), scaled to this window.
  const circle = (p) => {
    const x = (p.x / p.w) * innerWidth, y = (p.y / p.h) * innerHeight;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.style.setProperty("--aero-reveal-x", `${Math.round(x)}px`);
    root.style.setProperty("--aero-reveal-y", `${Math.round(y)}px`);
    root.style.setProperty("--aero-reveal-r", `${Math.ceil(r)}px`);
  };

  // Arriving: what the previous page was (if it was ours, just now), and how we got here.
  let offset = null; // where a gesture left the last page (aero:transition's offset), for the sheet to carry on from
  const type = () => {
    const s = load(KEY);
    offset = s && s.via && s.via.offset;
    try { sessionStorage.removeItem(KEY); } catch {}
    if (!s || Date.now() - s.t > 10000 || s.url === page(location.href)) return null;
    const here = page(location.href);
    if (s.via && s.via.name === "reveal" && s.via.href === here) {
      save(OPENED + location.pathname, s.via); // so going back can close into the same point
      circle(s.via);
      return "aero-reveal";
    }
    if (!(s.via && s.via.name !== "reveal") && s.opened && s.opened.name === "reveal" && s.opened.from === here) {
      circle(s.opened);
      return "aero-reveal-back";
    }
    const to = kind();
    if (s.kind === "base" && to === "base") return null;
    return s.kind === to ? "aero-fade" : to === "sheet" ? "aero-sheet" : "aero-sheet-back";
  };

  const ARRIVE = { "aero-sheet": "right", "aero-sheet-back": "left", "aero-reveal": "point", "aero-reveal-back": "left" };
  if ("onpagereveal" in window) {
    addEventListener("pagereveal", (e) => {
      const vt = e.viewTransition;
      if (!vt) return;
      if (still()) return vt.skipTransition();
      const t = type();
      if (t && vt.types) vt.types.add(t);
      if (t === "aero-sheet-back" && offset) {
        root.style.setProperty("--aero-sheet-from", offset);
        vt.finished.finally(() => root.style.removeProperty("--aero-sheet-from"));
      }
    });
  } else if (!still()) {
    const side = ARRIVE[type()];
    if (side) root.classList.add("aero-arrive", "ae-arrive", `aero-from-${side}`, `ae-from-${side}`);
  }
})();
