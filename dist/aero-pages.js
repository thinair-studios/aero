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
 * The back and forward buttons work the same way. Browsers without cross-document View
 * Transitions get the same direction from aero-arrive instead (arrival.css).
 */
(() => {
  const root = document.documentElement, KEY = "aero-page-from";
  const kind = () => (root.dataset.aeroPage === "sheet" ? "sheet" : "base");
  const still = () => root.classList.contains("aero-reduce-motion") && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Leaving: remember what kind of page this was. pageswap runs before the next page starts;
  // pagehide covers browsers without it.
  const leaving = () => {
    try { sessionStorage.setItem(KEY, JSON.stringify({ kind: kind(), url: location.href, t: Date.now() })); } catch {}
  };
  addEventListener("pageswap", leaving);
  addEventListener("pagehide", leaving);

  // Arriving: the previous page's kind (if it was ours, just now) and this one's give the type.
  const type = () => {
    let from = null;
    try {
      const s = JSON.parse(sessionStorage.getItem(KEY) || "null");
      sessionStorage.removeItem(KEY);
      if (s && Date.now() - s.t < 10000 && s.url !== location.href) from = s.kind;
    } catch {}
    const to = kind();
    if (!from || (from === "base" && to === "base")) return null;
    return from === to ? "aero-fade" : to === "sheet" ? "aero-sheet" : "aero-sheet-back";
  };

  if ("onpagereveal" in window) {
    addEventListener("pagereveal", (e) => {
      const vt = e.viewTransition;
      if (!vt) return;
      if (still()) return vt.skipTransition();
      const t = type();
      if (t && vt.types) vt.types.add(t);
    });
  } else if (!still()) {
    const t = type();
    if (t === "aero-sheet") root.classList.add("aero-arrive", "ae-arrive", "aero-from-right", "ae-from-right");
    if (t === "aero-sheet-back") root.classList.add("aero-arrive", "ae-arrive", "aero-from-left", "ae-from-left");
  }
})();
