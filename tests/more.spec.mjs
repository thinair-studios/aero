// Aero 2.2: exits, overlays, attention, text split, numbers, repeat, events, layout, page transitions,
// and draw, collapse, marquee, depth, magnetic, springs, stagger order, lines, flip, shimmer, underline.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const anims = (page, id) => page.evaluate((id) => document.getElementById(id).getAnimations().map((a) => a.animationName || a.transitionProperty), id);

test("wipe: an entrance revealed by a moving edge", async ({ page }) => {
  await page.goto("/tests/more.html");
  await expect(page.locator("#wipe")).toHaveClass(/\baero-in\b/);
  expect(await anims(page, "wipe")).toEqual(["aero-wipe-right"]);
});

test("exit: Aero.leave plays the exit, then removes the element", async ({ page }) => {
  await page.goto("/tests/more.html");
  const during = await page.evaluate(() => {
    const el = document.getElementById("leaver");
    window.left = Aero.leave(el, { remove: true }).then((x) => x.id);
    return el.getAnimations().map((a) => a.animationName);
  });
  expect(during).toEqual(["aero-leave-right"]);
  expect(await page.evaluate(() => window.left)).toBe("leaver");
  await expect(page.locator("#leaver")).toHaveCount(0);
});

test("attention: shake plays, Aero.replay starts it again, spin loops", async ({ page }) => {
  await page.goto("/tests/more.html");
  const r = await page.evaluate(async () => {
    const el = document.getElementById("shake");
    await new Promise((res) => setTimeout(res, 200));
    const before = el.getAnimations()[0].currentTime;
    Aero.replay(el);
    const after = el.getAnimations()[0].currentTime;
    const spin = document.getElementById("spin").getAnimations()[0].effect.getComputedTiming().iterations;
    return { before, after, spin };
  });
  expect(r.before).toBeGreaterThan(100);
  expect(r.after).toBeLessThan(50);
  expect(r.spin).toBe(Infinity);
});

test("text split: words keep inline markup, letters stay readable", async ({ page }) => {
  await page.goto("/tests/more.html");
  const r = await page.evaluate(() => {
    const w = document.getElementById("words"), l = document.getElementById("letters");
    return {
      words: [...w.querySelectorAll(".aero-piece")].map((p) => p.textContent),
      em: w.querySelector("em .aero-piece")?.textContent,
      wordsText: w.textContent.replace(/\s+/g, " ").trim(),
      letters: l.querySelectorAll(".aero-piece").length,
      sr: l.querySelector(".aero-split-text")?.textContent,
      hidden: l.querySelector(".aero-word").getAttribute("aria-hidden"),
      last: getComputedStyle(l.querySelectorAll(".aero-piece")[3]).getPropertyValue("--aero-i").trim(),
    };
  });
  expect(r.words).toEqual(["Motion", "out", "of", "thin", "air"]);
  expect(r.em).toBe("thin");
  expect(r.wordsText).toBe("Motion out of thin air");
  expect(r.letters).toBe(4);
  expect(r.sr).toBe("Aero");
  expect(r.hidden).toBe("true");
  expect(r.last).toBe("3");
  await expect(page.locator("#letters .aero-piece").last()).toHaveClass(/\baero-in\b/);
});

test("count: starts at zero and ends on the exact original text", async ({ page }) => {
  await page.goto("/tests/more.html");
  await expect(page.locator("#count")).toHaveText("€1,250+");
  const seen = await page.evaluate(() => counted);
  expect(seen[0]).toBe("€0+");
  expect(seen.length).toBeGreaterThan(3); // it counted through values, not jumped
  expect(seen.at(-1)).toBe("€1,250+");
});

test("repeat and events: plays again after leaving the screen; aero:in and aero:done fire", async ({ page }) => {
  await page.goto("/tests/more.html");
  const el = page.locator("#repeat");
  await el.scrollIntoViewIfNeeded();
  await expect(el).toHaveClass(/\baero-in\b/);
  await expect.poll(() => page.evaluate(() => events.some(([t, id]) => t === "aero:done" && id === "repeat"))).toBe(true);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(el).not.toHaveClass(/\baero-in\b/);
  await el.scrollIntoViewIfNeeded();
  await expect(el).toHaveClass(/\baero-in\b/);
  await expect.poll(() => page.evaluate(() => events.filter(([, id]) => id === "repeat").map(([t]) => t))).toEqual(["aero:in", "aero:done", "aero:in", "aero:done"]);
});

test("overlays: dialog, drawer and popover animate open", async ({ page }) => {
  await page.goto("/tests/more.html");
  const r = await page.evaluate(() => {
    const d = document.getElementById("dialog"), dr = document.getElementById("drawer"), p = document.getElementById("pop");
    d.showModal();
    const dialog = d.getAnimations().map((a) => a.transitionProperty).sort();
    d.close();
    dr.showModal();
    const drawer = dr.getAnimations().map((a) => a.transitionProperty);
    dr.close();
    p.showPopover();
    const pop = p.getAnimations().map((a) => a.transitionProperty).sort();
    return { dialog, drawer, pop };
  });
  expect(r.dialog).toEqual(expect.arrayContaining(["opacity", "transform"]));
  expect(r.drawer).toContain("transform");
  expect(r.pop).toEqual(expect.arrayContaining(["opacity", "transform"]));
});

test("overlays: closing a dialog animates it out", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Firefox and Safari close a modal at once (no transition for the top layer's overlay yet)");
  await page.goto("/tests/more.html");
  const closing = await page.evaluate(async () => {
    const d = document.getElementById("dialog");
    d.showModal();
    await new Promise((r) => setTimeout(r, 500));
    d.close();
    return d.getAnimations().map((a) => a.transitionProperty);
  });
  expect(closing).toEqual(expect.arrayContaining(["opacity"]));
});

test("swap: layout changes inside Aero.swap, and every element ends in its new place", async ({ page }) => {
  await page.goto("/tests/more.html");
  const order = await page.evaluate(async () => {
    const list = document.getElementById("list");
    await Aero.swap(() => list.prepend(document.getElementById("m3")));
    return [...list.children].map((x) => x.id);
  });
  expect(order).toEqual(["m3", "m1", "m2"]);
});

const P2 = "/tests/more2.html";
const settle = (page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.timeline === document.timeline && a.playState !== "paused" && a.effect.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
const pointOf = (page, sel, fx = 0.5, fy = 0.5) => page.evaluate(([sel, fx, fy]) => {
  document.querySelector(sel).scrollIntoView({ block: "center" });
  const r = document.querySelector(sel).getBoundingClientRect();
  return { x: r.left + r.width * fx, y: r.top + r.height * fy };
}, [sel, fx, fy]);

test("draw: pathLength is set, and the stroke draws in on an <svg> and on a single path", async ({ page }) => {
  await page.goto(P2);
  const r = await page.evaluate(() => {
    const at = (svgSel, pathSel) => {
      const svg = document.querySelector(svgSel), path = document.querySelector(pathSel);
      const a = svg.getAnimations().find((x) => x.animationName === "aero-draw");
      a.pause();
      a.currentTime = a.effect.getComputedTiming().duration * 0.5;
      const cs = getComputedStyle(path);
      return { name: a.animationName, offset: parseFloat(cs.strokeDashoffset), pl: [...svg.querySelectorAll("path, circle")].map((n) => n.getAttribute("pathLength")) };
    };
    return { svg: at("#draw-svg", "#draw-b"), own: at("#draw-own", "#draw-own") };
  });
  expect(r.svg.name).toBe("aero-draw");
  expect(r.svg.pl).toEqual(["1", "1"]);
  expect(r.svg.offset).toBeCloseTo(0.5, 1);
  expect(r.own.pl).toEqual([]);
  expect(r.own.offset).toBeCloseTo(0.5, 1);
  expect(await page.getAttribute("#draw-own", "pathLength")).toBe("1");
});

for (const q of ["", "?nonative"]) {
  test(`draw: scrubbed, the stroke follows the scroll ${q}`, async ({ page }) => {
    await page.goto(P2 + q);
    const offset = () => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#draw-scrub-svg path")).strokeDashoffset));
    await expect.poll(offset).toBeCloseTo(1, 1); // far below: not drawn yet
    await page.evaluate(() => document.getElementById("draw-scrub-svg").scrollIntoView({ block: "center" }));
    await expect.poll(async () => { const v = await offset(); return v > 0.3 && v < 0.7; }).toBe(true); // half way through its pass
    await page.evaluate(() => scrollTo(0, 0));
    await expect.poll(offset).toBeCloseTo(1, 1);
  });
}

test("collapse: opening a <details> runs a block-size transition (it just opens where unsupported)", async ({ page }) => {
  await page.goto(P2);
  const supported = await page.evaluate(() => CSS.supports("selector(::details-content)") && CSS.supports("interpolate-size", "allow-keywords"));
  await page.click("#collapse summary");
  expect(await page.evaluate(() => document.getElementById("collapse").open)).toBe(true);
  test.skip(!supported, "this browser has no ::details-content or interpolate-size yet, so the content opens at once");
  // Chrome doesn't list ::details-content transitions in getAnimations(), so watch the size itself: part way, then fully open.
  const size = () => page.evaluate(() => parseFloat(getComputedStyle(document.getElementById("collapse"), "::details-content").blockSize));
  await page.waitForTimeout(300); // the fixture's transition lasts 1s
  const mid = await size();
  expect(mid).toBeGreaterThan(5);
  expect(mid).toBeLessThan(195);
  await expect.poll(size).toBe(200);
});

test("marquee: the track is duplicated once (aria-hidden, inert), scrolls, and pauses on hover", async ({ page }) => {
  await page.goto(P2);
  const r = await page.evaluate(async () => {
    const track = document.getElementById("track");
    const kids = [...track.children];
    const a = track.getAnimations()[0];
    const t0 = getComputedStyle(track).transform;
    await new Promise((res) => setTimeout(res, 300));
    return {
      n: kids.length, hidden: kids.map((k) => k.getAttribute("aria-hidden")), inert: kids.map((k) => k.inert),
      ids: document.querySelectorAll("#dup").length, half: kids[3].offsetLeft, width: track.getBoundingClientRect().width,
      name: a.animationName, iterations: a.effect.getComputedTiming().iterations, moved: getComputedStyle(track).transform !== t0,
    };
  });
  expect(r.n).toBe(6);
  expect(r.hidden).toEqual([null, null, null, "true", "true", "true"]);
  expect(r.inert).toEqual([false, false, false, true, true, true]);
  expect(r.ids).toBe(1);
  expect(r.half * 2).toBe(r.width);
  expect(r.name).toBe("aero-marquee");
  expect(r.iterations).toBe(Infinity);
  expect(r.moved).toBe(true);
  const p = await pointOf(page, "#marquee");
  await page.mouse.move(p.x, p.y);
  await expect.poll(() => page.evaluate(() => document.getElementById("track").getAnimations()[0].playState)).toBe("paused");
  await page.mouse.move(0, 0);
  await expect.poll(() => page.evaluate(() => document.getElementById("track").getAnimations()[0].playState)).toBe("running");
  expect(await page.evaluate(() => document.querySelector("#marquee-r > div").getAnimations()[0].effect.getComputedTiming().direction)).toBe("reverse");
});

for (const q of ["", "?nonative"]) {
  test(`depth: moves against the scroll, down below its place before it passes and up after ${q}`, async ({ page }) => {
    await page.goto(P2 + q);
    const shift = async (f) => {
      await page.evaluate((f) => { const el = document.getElementById("depth"); scrollTo(0, el.getBoundingClientRect().top + scrollY - f * innerHeight); }, f);
      await page.waitForTimeout(150);
      return page.evaluate(() => ({ name: document.getElementById("depth").getAnimations()[0]?.animationName, y: parseFloat(getComputedStyle(document.getElementById("depth")).translate.split(" ")[1]) }));
    };
    expect((await shift(0.9)).name).toBe("aero-depth");
    await expect.poll(async () => (await shift(0.9)).y).toBeGreaterThan(20);
    await expect.poll(async () => (await shift(0.05)).y).toBeLessThan(-20);
  });
}

test("magnetic: a button that is its own .aero-cursor settles instead of chasing itself", async ({ page }) => {
  await page.goto(P2);
  const b = page.locator("#mag-self");
  await b.scrollIntoViewIfNeeded();
  const box = await b.boundingBox();
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.5, { steps: 4 });
  await page.waitForTimeout(700);
  const xs = [];
  for (let i = 0; i < 6; i++) { xs.push(await b.evaluate((e) => parseFloat(getComputedStyle(e).translate))); await page.waitForTimeout(60); }
  expect(xs[0]).toBeGreaterThan(10); // it leaned toward the pointer (0.7 of 24px)
  expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.5); // and holds still
});

test("magnetic: the button leans toward the pointer inside its .aero-cursor area, and settles at rest", async ({ page }) => {
  await page.goto(P2);
  await pointOf(page, "#mag-area");
  const area = await page.evaluate(() => document.getElementById("mag-area").getBoundingClientRect().toJSON());
  const b = await pointOf(page, "#mag");
  await page.mouse.move(area.left + 5, b.y);
  await page.mouse.move(area.right - 5, b.y, { steps: 6 });
  const tr = () => page.evaluate(() => parseFloat(getComputedStyle(document.getElementById("mag")).translate) || 0);
  await expect.poll(tr).toBeGreaterThan(5);
  expect(await tr()).toBeLessThanOrEqual(10.01);
  await page.mouse.move(area.left + 5, b.y, { steps: 6 });
  await expect.poll(tr).toBeLessThan(-5);
  await page.mouse.move(0, 0);
  await expect.poll(tr).toBeCloseTo(0, 0);
});

test("springs: spring, spring-soft and bounce are linear() easings", async ({ page }) => {
  await page.goto(P2);
  const r = await page.evaluate(() => ["ease-spring", "ease-soft", "ease-bounce"].map((id) => getComputedStyle(document.getElementById(id)).animationTimingFunction));
  for (const e of r) expect(e).toMatch(/^linear\(/);
  expect(new Set(r).size).toBe(3);
});

test("stagger order: end, center and random set --aero-i, and again when children are added", async ({ page }) => {
  await page.goto(P2);
  const r = await page.evaluate(async () => {
    const vals = (id) => [...document.getElementById(id).children].map((c) => parseFloat(c.style.getPropertyValue("--aero-i")));
    const end = vals("st-end"), center = vals("st-center"), random = vals("st-random");
    Aero.refresh();
    const again = vals("st-random");
    document.getElementById("st-end").append(document.createElement("li"));
    await new Promise((res) => setTimeout(res, 100));
    return { end, center, random, again, end5: vals("st-end") };
  });
  expect(r.end).toEqual([3, 2, 1, 0]);
  expect(r.center).toEqual([2, 1, 0, 1, 2]);
  expect([...r.random].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  expect(r.again).toEqual(r.random);
  expect(r.end5).toEqual([4, 3, 2, 1, 0]);
});

test("stagger order: removing the attribute restores the default, and setting it again applies again", async ({ page }) => {
  await page.goto(P2);
  const r = await page.evaluate(() => {
    const el = document.getElementById("st-end"), vals = () => [...el.children].map((c) => c.style.getPropertyValue("--aero-i"));
    delete el.dataset.aeroStaggerFrom; Aero.refresh();
    const cleared = vals();
    el.dataset.aeroStaggerFrom = "end"; Aero.refresh();
    return { cleared, back: vals().map(Number) };
  });
  expect(r.cleared.every((x) => x === "")).toBe(true);
  expect(r.back).toEqual([3, 2, 1, 0]);
});

test("lines: each rendered line gets its mask and rises; tags are kept; screen readers get the text once", async ({ page }) => {
  await page.goto(P2);
  await expect(page.locator("#lines .aero-piece").first()).toHaveClass(/\baero-in\b/);
  const r = await page.evaluate(() => {
    const el = document.getElementById("lines");
    const lines = [...el.querySelectorAll(".aero-line")];
    return {
      n: lines.length, pieces: lines.map((l) => l.querySelectorAll(":scope > .aero-piece").length),
      overflow: getComputedStyle(lines[0]).overflow, hidden: lines.every((l) => l.getAttribute("aria-hidden") === "true"),
      idx: lines.map((l) => l.firstElementChild.style.getPropertyValue("--aero-i")),
      anim: lines.map((l) => l.firstElementChild.getAnimations()[0]?.animationName),
      em: [...el.querySelectorAll("em")].map((e) => e.textContent).join(" "),
      sr: el.querySelector(".aero-split-text").textContent,
      text: lines.map((l) => l.textContent).join(" ").replace(/\s+/g, " "),
    };
  });
  expect(r.n).toBeGreaterThan(2);
  expect(r.pieces.every((n) => n === 1)).toBe(true);
  expect(r.overflow).toBe("clip");
  expect(r.hidden).toBe(true);
  expect(r.idx).toEqual(r.idx.map((_, i) => String(i)));
  expect(r.anim.every((a) => a === "aero-fade-up")).toBe(true);
  expect(r.em).toBe("wrap and keep");
  expect(r.sr).toBe("Lines that wrap and keep their tags when the text is long enough");
  expect(r.text).toBe(r.sr);
});

test("lines: split again on resize until played, then left alone", async ({ page }) => {
  await page.goto(P2);
  await expect(page.locator("#lines .aero-piece").first()).toHaveClass(/\baero-in\b/);
  const count = (id) => page.evaluate((id) => document.getElementById(id).querySelectorAll(".aero-line").length, id);
  const [late, played] = [await count("lines-late"), await count("lines")];
  await page.setViewportSize({ width: 360, height: 700 });
  await expect.poll(() => count("lines-late")).toBeGreaterThan(late);
  await page.setViewportSize({ width: 1400, height: 700 });
  await expect.poll(() => count("lines-late")).toBe(late);
  expect(await count("lines")).toBe(played); // the one that already played keeps its lines
});

test("flip: hover turns the card over on Y, .aero-flipped does too, the front hides its back", async ({ page }) => {
  await page.goto(P2);
  const m11 = (id) => page.evaluate((id) => new DOMMatrix(getComputedStyle(document.getElementById(id)).transform).m11, id);
  expect(await m11("flip")).toBeCloseTo(1, 1);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector("#flip .aero-front")).backfaceVisibility)).toBe("hidden");
  const p = await pointOf(page, "#flip");
  await page.mouse.move(p.x, p.y);
  expect(await page.evaluate(() => document.getElementById("flip").getAnimations().map((a) => a.transitionProperty))).toEqual(["transform"]);
  await settle(page);
  expect(await m11("flip")).toBeCloseTo(-1, 1);
  await page.mouse.move(0, 0);
  await settle(page);
  expect(await m11("flip")).toBeCloseTo(1, 1);
  await page.evaluate(() => document.getElementById("flip-click").classList.add("aero-flipped"));
  await settle(page);
  expect(await m11("flip-click")).toBeCloseTo(-1, 1);
});

test("shimmer: a band sweeps across, forever", async ({ page }) => {
  await page.goto(P2);
  const r = await page.evaluate(() => {
    const a = document.getAnimations().find((x) => x.animationName === "aero-shimmer");
    return { pseudo: a.effect.pseudoElement, iterations: a.effect.getComputedTiming().iterations, target: a.effect.target.id, overflow: getComputedStyle(a.effect.target).overflow };
  });
  expect(r).toEqual({ pseudo: "::after", iterations: Infinity, target: "shimmer", overflow: "clip" });
});

test("underline: draws in from the left on hover, and leaves toward the right", async ({ page }) => {
  await page.goto(P2);
  const line = () => page.evaluate(() => {
    const cs = getComputedStyle(document.getElementById("underline"), "::after");
    return { sx: new DOMMatrix(cs.transform).a, originX: parseFloat(cs.transformOrigin), height: cs.height };
  });
  expect((await line()).sx).toBeCloseTo(0, 1);
  const p = await pointOf(page, "#underline");
  await page.mouse.move(p.x, p.y);
  const hovering = await page.evaluate(() => document.getAnimations().filter((a) => a.effect.pseudoElement === "::after").map((a) => a.transitionProperty));
  expect(hovering).toEqual(["transform"]);
  expect((await line()).originX).toBe(0);
  await settle(page);
  const on = await line();
  expect(on.sx).toBeCloseTo(1, 1);
  expect(on.height).toBe("2px");
  await page.mouse.move(0, 0);
  expect((await line()).originX).toBeGreaterThan(20); // the origin switched to the right edge
  await settle(page);
  expect((await line()).sx).toBeCloseTo(0, 1);
});

test("reduced motion (opt-in): marquee and shimmer stop, flip and underline are instant", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(P2 + "?reduce");
  expect(await page.evaluate(() => document.getAnimations().filter((a) => /^aero-(marquee|shimmer)$/.test(a.animationName)).length)).toBe(0);
  expect(await page.evaluate(() => [getComputedStyle(document.getElementById("flip")).transitionDuration, getComputedStyle(document.getElementById("underline"), "::after").transitionDuration, getComputedStyle(document.getElementById("mag")).transitionDuration])).toEqual(["0s", "0s", "0s"]);
});

test("aero-pages.js is safe to inline in a <script>", () => {
  const js = readFileSync(new URL("../dist/aero-pages.js", import.meta.url), "utf8");
  expect(js).not.toMatch(/<\/script/i);
});

test.describe("page transitions", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      addEventListener("pagereveal", (e) => {
        // after aero-pages.js's own listener has tagged it
        setTimeout(() => { window.__types = e.viewTransition ? [...e.viewTransition.types] : null; });
      });
    });
  });
  const go = async (page, id) => {
    await page.click(`#${id}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(100);
    return page.evaluate(() => ({ vt: "onpagereveal" in window, types: window.__types, cls: document.documentElement.className }));
  };
  test("base -> sheet slides in, sheet -> base slides away, sheet -> sheet fades", async ({ page }) => {
    await page.goto("/tests/pages/base.html");
    const toSheet = await go(page, "to-sheet");
    const toSheet2 = await go(page, "to-sheet2");
    const toBase = await go(page, "to-base");
    if (toSheet.vt) {
      expect(toSheet.types).toEqual(["aero-sheet"]);
      expect(toSheet2.types).toEqual(["aero-fade"]);
      expect(toBase.types).toEqual(["aero-sheet-back"]);
    } else {
      expect(toSheet.cls).toMatch(/aero-arrive.*aero-from-right/);
      expect(toSheet2.cls).not.toMatch(/aero-arrive/);
      expect(toBase.cls).toMatch(/aero-arrive.*aero-from-left/);
    }
  });
  test("reveal: a link opens the next page out of the point you clicked, and back closes it there", async ({ page }) => {
    await page.goto("/tests/pages/base.html");
    const opened = await go(page, "reveal-sheet");
    const x = await page.evaluate(() => document.documentElement.style.getPropertyValue("--aero-reveal-x"));
    const back = await go(page, "to-base");
    if (opened.vt) {
      expect(opened.types).toEqual(["aero-reveal"]);
      expect(parseInt(x)).toBeGreaterThan(280);
      expect(back.types).toEqual(["aero-reveal-back"]);
    } else {
      expect(opened.cls).toMatch(/aero-from-point/);
      expect(back.cls).toMatch(/aero-from-left/);
    }
  });
  test("a page previewed in a frame doesn't change how the next navigation is tagged", async ({ page }) => {
    await page.goto("/tests/pages/sheet.html");
    await page.evaluate(async () => {
      const f = Object.assign(document.createElement("iframe"), { src: "/tests/pages/base.html" });
      document.body.append(f);
      await new Promise((r) => f.addEventListener("load", r));
    });
    const back = await go(page, "to-base");
    if (back.vt) expect(back.types).toEqual(["aero-sheet-back"]);
    else expect(back.cls).toMatch(/aero-from-left/);
  });
  test("the back button runs the same way", async ({ page }) => {
    await page.goto("/tests/pages/base.html");
    await go(page, "to-sheet");
    await page.goBack();
    await page.waitForTimeout(150);
    const back = await page.evaluate(() => ({ vt: "onpagereveal" in window, types: window.__types, cls: document.documentElement.className }));
    if (back.vt) expect(back.types).toEqual(["aero-sheet-back"]);
    else if (back.cls) expect(back.cls).toMatch(/aero-from-left/); // from the back-forward cache nothing runs, which is fine
  });
});
