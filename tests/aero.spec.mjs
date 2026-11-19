// Aero's behaviour, checked in Chromium, Firefox and WebKit (see playwright.config.mjs).
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../dist/aero.css", import.meta.url), "utf8");
const ruleCount = (css.match(/{/g) || []).length - 1; // every rule, minus the @layer wrapper itself

// Scroll so the element's top sits at a few heights in the viewport, and read its scrub state.
async function sample(page, id) {
  return page.evaluate(async (id) => {
    const el = document.getElementById(id);
    const top = () => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
    const out = [];
    for (const f of [0.95, 0.85, 0.7, 0.5, 0.3, 0.1]) {
      scrollTo(0, top() - f * innerHeight);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 60));
      const t = el.getAnimations()[0]?.effect.getComputedTiming();
      out.push({ aero: window.Aero.progress(el), native: t?.progress ?? null, opacity: +getComputedStyle(el).opacity });
    }
    return out;
  }, id);
}

test("every rule in dist/aero.css parses, inside @layer aero", async ({ page }) => {
  await page.goto("/tests/fixture.html");
  const got = await page.evaluate(() => {
    const sheet = [...document.styleSheets].find((s) => s.href?.endsWith("/dist/aero.css"));
    const count = (rules) => [...rules].reduce((n, r) => n + 1 + (r.cssRules ? count(r.cssRules) : 0), 0);
    return { layer: sheet.cssRules[0].name, rules: count(sheet.cssRules[0].cssRules) };
  });
  expect(got.layer).toBe("aero");
  expect(got.rules).toBe(ruleCount);
});

test("entrances play when they come into view, with either prefix", async ({ page }) => {
  await page.goto("/tests/fixture.html");
  for (const id of ["enter-aero", "enter-ae"]) {
    await expect(page.locator(`#${id}`)).toHaveClass(/\baero-in\b/);
    await expect(page.locator(`#${id}`)).toHaveClass(/\bae-in\b/);
  }
  const names = await page.evaluate(() => ["enter-aero", "enter-ae"].map((id) => document.getElementById(id).getAnimations().map((a) => a.animationName)));
  expect(names).toEqual([["aero-fade-up"], ["aero-fade-left"]]);
  await expect(page.locator("#enter-aero")).toHaveCSS("opacity", "1");
});

test("scrub: aero.js agrees with the browser's own scroll timeline", async ({ page }) => {
  await page.goto("/tests/fixture.html");
  test.skip(!(await page.evaluate(() => CSS.supports("animation-timeline: view()"))), "no native scroll timelines here; covered by the fallback test");
  for (const id of ["scrub-entry", "scrub-cover", "scrub-mixed"]) {
    for (const s of await sample(page, id)) {
      if (s.native !== null && s.aero > 0.02 && s.aero < 0.98) expect(Math.abs(s.aero - s.native), `${id} ${JSON.stringify(s)}`).toBeLessThan(0.03);
    }
  }
});

test("scrub fallback: without scroll timelines, aero.js drives the same animation", async ({ page }) => {
  await page.goto("/tests/fixture.html?nonative");
  await expect(page.locator("html")).toHaveClass(/\baero-scrub-js\b/);
  // aero-fade-up is linear from opacity 0, so its opacity is its progress.
  const samples = await sample(page, "scrub-entry");
  expect(samples.some((s) => s.aero > 0.1 && s.aero < 0.9)).toBe(true);
  for (const s of samples) expect(Math.abs(s.opacity - s.aero), JSON.stringify(s)).toBeLessThan(0.05);
});

test("hover: real pointer on a self-triggered effect", async ({ page }) => {
  await page.goto("/tests/fixture.html");
  await page.hover("#shift");
  await expect(page.locator("#shift")).toHaveCSS("transform", "matrix(1.02, 0, 0, 1.02, -8, 0)");
});

test("hover: focus inside a group moves its target", async ({ page }) => {
  await page.goto("/tests/fixture.html");
  await page.focus("#group-link");
  await expect(page.locator("#rise")).toHaveCSS("transform", "matrix(1.03, 0, 0, 1.03, 0, -6)");
});

test("cursor: the runtime writes pointer position on .aero-cursor", async ({ page }) => {
  await page.goto("/tests/fixture.html");
  await page.locator("#cursor").scrollIntoViewIfNeeded();
  const box = await page.locator("#cursor").boundingBox();
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.2);
  await expect.poll(() => page.locator("#cursor").evaluate((el) => +el.style.getPropertyValue("--aero-cursor-active"))).toBeGreaterThan(0.9);
  const cx = await page.locator("#cursor").evaluate((el) => +el.style.getPropertyValue("--aero-cursor-cx"));
  expect(cx).toBeGreaterThan(0.5);
  await expect(page.locator("#tilt")).not.toHaveCSS("transform", "none");
});

test("page arrival: <main> slides in once and lets go of transform", async ({ page }) => {
  await page.goto("/tests/fixture.html");
  const anim = await page.evaluate(() => {
    document.documentElement.classList.add("aero-arrive", "aero-from-right");
    const a = document.getElementById("main").getAnimations()[0];
    return { name: a?.animationName, fill: a?.effect.getComputedTiming().fill };
  });
  expect(anim).toEqual({ name: "aero-fade-left", fill: "backwards" });
});

test("reduced motion: motion plays by default, and stops when the site opts in", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tests/fixture.html");
  await expect(page.locator("#enter-aero")).toHaveClass(/\baero-in\b/);
  expect(await page.locator("#enter-aero").evaluate((el) => el.getAnimations().length)).toBe(1);

  await page.goto("/tests/fixture.html?reduce");
  await expect(page.locator("#enter-aero")).toHaveCSS("opacity", "1");
  const moving = await page.evaluate(() => ["enter-aero", "scrub-entry"].map((id) => document.getElementById(id).getAnimations().length));
  expect(moving).toEqual([0, 0]);
  await page.hover("#shift");
  await expect(page.locator("#shift")).toHaveCSS("transform", "none");
});

test.describe("touch screens", () => {
  test.use({ hasTouch: true });
  test("a tap doesn't leave a hover effect stuck", async ({ page, browserName }) => {
    test.skip(browserName === "firefox", "Firefox can't emulate a touch-only device");
    await page.goto("/tests/fixture.html");
    test.skip(!(await page.evaluate(() => matchMedia("(hover: none)").matches)), "this engine doesn't report hover: none under touch emulation");
    await page.tap("#shift");
    await page.waitForTimeout(600);
    await expect(page.locator("#shift")).toHaveCSS("transform", "none");
  });
});
