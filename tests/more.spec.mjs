// Aero 2.2: exits, overlays, attention, text split, numbers, repeat, events, layout and page transitions.
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
