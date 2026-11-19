#!/usr/bin/env node
// Builds dist/ from src/. No dependencies.
//   node scripts/build.mjs          write dist/
//   node scripts/build.mjs --check  exit 1 if dist/ is out of date (for CI)
//
// What it does to the CSS: drops comments, adds an `ae-` copy of every rule that uses an
// `.aero-` class (so both prefixes work), and wraps each file in `@layer aero`.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(root + p, "utf8");
const pkg = JSON.parse(read("package.json"));

// Order matters only for readability: rules don't depend on each other's position.
const MODULES = ["core", "entrances", "scroll", "hover", "cursor", "arrival", "motion"];

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

// Every selector list that mentions an .aero- class gets the same list again with .ae-.
function addShortPrefix(css) {
  let out = "", buf = "";
  for (const ch of css) {
    if (ch === "{") {
      const prelude = buf.trim();
      const lead = buf.match(/^\s*/)[0];
      out += prelude && !prelude.startsWith("@") && prelude.includes(".aero-")
        ? `${lead}${prelude}, ${prelude.replace(/\.aero-/g, ".ae-")} {`
        : `${buf}{`;
      buf = "";
    } else if (ch === "}" || ch === ";") { out += buf + ch; buf = ""; }
    else buf += ch;
  }
  return out + buf;
}

const tidy = (css) => css.replace(/\n\s*\n+/g, "\n").trim();
const layer = (css) => `@layer aero {\n${css}\n}\n`;
const banner = (what) => `/* Aero ${pkg.version} — ${what}. https://github.com/thinair-studios/aero (MIT) */\n`;
const minify = (css) => css
  .replace(/\s+/g, " ")
  .replace(/\s*([{};,>])\s*/g, "$1")
  .replace(/;}/g, "}")
  .trim();

const files = {};
const built = {};
for (const m of MODULES) built[m] = tidy(addShortPrefix(stripComments(read(`src/${m}.css`))));

for (const m of MODULES) files[`dist/${m}.css`] = banner(m) + layer(built[m]);
const all = MODULES.map((m) => built[m]).join("\n");
files["dist/aero.css"] = banner("all modules") + layer(all);
files["dist/aero.min.css"] = banner("all modules, minified") + minify(layer(all)) + "\n";
files["dist/legacy.css"] = banner("1.x class names, for code written before 2.0; not layered") + read("src/legacy.css");

const js = read("src/aero.js");
files["dist/aero.js"] = banner("runtime") + js;
files["dist/aero.mjs"] = banner("runtime, as an ES module") + js +
  `\nconst Aero = typeof window !== "undefined" ? window.Aero : { refresh() {}, progress() { return 0; } };\n` +
  `export const { refresh, progress } = Aero;\nexport default Aero;\n`;
files["dist/aero.d.ts"] = `export interface AeroRuntime {
  /** Re-scan the page now. Normally not needed: new elements are picked up automatically. */
  refresh(): void;
  /** A scrubbed element's position in its range, 0 to 1. */
  progress(el: Element): number;
}
declare global {
  interface Window { Aero: AeroRuntime }
}
export declare const refresh: AeroRuntime["refresh"];
export declare const progress: AeroRuntime["progress"];
declare const Aero: AeroRuntime;
export default Aero;
`;

if (process.argv.includes("--check")) {
  const stale = Object.keys(files).filter((p) => !existsSync(root + p) || read(p) !== files[p]);
  if (stale.length) { console.error(`dist/ is out of date: ${stale.join(", ")}. Run npm run build.`); process.exit(1); }
  console.log("dist/ is up to date");
} else {
  mkdirSync(root + "dist", { recursive: true });
  for (const [p, body] of Object.entries(files)) writeFileSync(root + p, body);
  console.log(`built ${Object.keys(files).length} files`);
}
