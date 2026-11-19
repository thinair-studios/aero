// Static server for the tests (no dependencies): serves the repo root on :4173.
// /tests/aero-nonative.css is dist/aero.css without its native scroll-timeline block, to test the
// aero.js fallback in browsers that do support scroll timelines.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml" };

// Remove every `@supports (animation-timeline: ...) { ... }` block, counting braces.
export function stripNative(css) {
  let out = "", i = 0;
  for (;;) {
    const at = css.indexOf("@supports (animation-timeline", i);
    if (at < 0) return out + css.slice(i);
    out += css.slice(i, at);
    let j = css.indexOf("{", at), depth = 0;
    for (; j < css.length; j++) { if (css[j] === "{") depth++; else if (css[j] === "}" && --depth === 0) break; }
    i = j + 1;
  }
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  try {
    if (path === "/tests/aero-nonative.css") {
      res.writeHead(200, { "content-type": "text/css" });
      return res.end(stripNative(await readFile(join(root, "dist/aero.css"), "utf8")));
    }
    const file = normalize(join(root, path.endsWith("/") ? path + "index.html" : path));
    if (!file.startsWith(root)) throw new Error("outside root");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404); res.end("not found");
  }
}).listen(4173, "127.0.0.1");
