#!/usr/bin/env node
/**
 * prepare-inspetor-demo.mjs
 * ─────────────────────────────────────────────────────────────
 * Trims the Claude Design HTML export of the Nuki Inspetor into a demo suitable
 * for embedding as an iframe inside the deck.
 *
 * Bundler variant — "x-dc" (see docs/demo-embedding.md):
 * the current export defines the app as a `<script type="text/x-dc">` block
 * inside `<script type="__bundler/template">`. The previous export was the
 * "App-in-template" variant (`PrototypeFlow` + `App` in a `text/babel` block).
 * Content patches operate against the TEMPLATE string; the manifest passes
 * through untouched.
 *
 * Steps applied:
 *
 *   1. Strip <TweaksPanel>…</TweaksPanel> — the Claude Design dev rail
 *      ("comparison variant" / "accent color") the prospect should not see.
 *      The x-dc export has no such rail, so this is currently a no-op and the
 *      template round-trip is skipped entirely (see below).
 *   2. Rewrite the outer document's <title> and <html lang>. The exporter emits
 *      a generic "Bundled Page" title and no lang.
 *   3. Inject the ESC bridge before </head>.
 *
 * Canonical patches 1/3 (initial screen / navigate intercept) are deliberately
 * not applied: we preserve the original flow starting at "login" so every step
 * of the prototype stays navigable.
 *
 * ── Gotcha 1: `$` expansion in the replacement string ──
 * TEMPLATE_RE has a capture group, so passing a replacement STRING to
 * String.replace makes `$1` inside it expand to the captured template. The x-dc
 * export contains one such token, in the e-mail masking call of the login
 * screen — a `.replace()` whose second argument is the string "$1•••••" —
 * which spliced 188 KB of raw payload into the middle of the JSON string and
 * left `<script type="__bundler/template">` unparseable — silently, with a
 * success message and exit code 0. Always use a replacer FUNCTION, which does
 * not interpret `$`.
 *
 * ── Gotcha 2: JSON.stringify does not re-escape "/" ──
 * The raw template writes closing tags as <\/Tag> so the HTML parser does not
 * terminate <script type="__bundler/template"> at the first "</". JSON.stringify
 * drops that escape, so we post-process with .replace(/<\//g, "<\\/") before
 * re-injecting.
 *
 * Reads:  src/HTML/Nuki-Inspetor-Embed.html
 * Writes: public/demos/inspetor/index.html
 *
 * Usage:
 *   node scripts/prepare-inspetor-demo.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = join(ROOT, "src", "HTML", "Nuki-Inspetor-Embed.html");
const OUT_DIR = join(ROOT, "public", "demos", "inspetor");
const OUT = join(OUT_DIR, "index.html");

console.log("[inspetor-demo] reading", SRC);
const html = readFileSync(SRC, "utf8");

const TEMPLATE_RE = /<script type="__bundler\/template">([\s\S]*?)<\/script>/;
const match = html.match(TEMPLATE_RE);
if (!match) throw new Error("Template script tag not found in HTML");

// The template payload is a JSON-encoded string (the Design bundler serializes
// the whole template HTML as a single string inside the <script>).
const template = JSON.parse(match[1].trim());
if (typeof template !== "string") {
  throw new Error(`Expected template to be a string, got ${typeof template}`);
}
console.log(`[inspetor-demo] template length: ${template.length}`);

const patches = { tweaks: 0, title: 0, lang: 0, escBridge: 0 };

let patched = template;

// Patch 1: strip TweaksPanel — the lazy match covers the whole JSX block.
const TWEAKS_RE = /<TweaksPanel>[\s\S]*?<\/TweaksPanel>/;
if (TWEAKS_RE.test(patched)) {
  patched = patched.replace(TWEAKS_RE, "");
  patches.tweaks++;
}

let newHtml = html;

// Only re-inject the template when a patch actually changed it. Re-encoding an
// unchanged template is an identity transform that buys nothing and risks the
// `$`-expansion and `<\/`-escaping gotchas above for no reason.
if (patches.tweaks > 0) {
  const encoded = JSON.stringify(patched).replace(/<\//g, "<\\/");
  // Replacer FUNCTION, not a string — see Gotcha 1.
  newHtml = newHtml.replace(
    TEMPLATE_RE,
    () => `<script type="__bundler/template">${encoded}</script>`,
  );
} else {
  console.log("[inspetor-demo] no template patches applied — template passed through verbatim");
}

// Patch 2: outer document metadata. The exporter emits "<title>Bundled Page"
// and a bare <html>. Anchored to the doctype because the template carries a
// second <html> occurrence of its own.
const TITLE_RE = /<title>[^<]*<\/title>/;
if (TITLE_RE.test(newHtml)) {
  newHtml = newHtml.replace(
    TITLE_RE,
    () => "<title>Nuki Inspetor — Protótipo navegável</title>",
  );
  patches.title++;
}

const ROOT_HTML_RE = /^(\s*<!DOCTYPE html>\s*)<html>/i;
if (ROOT_HTML_RE.test(newHtml)) {
  newHtml = newHtml.replace(ROOT_HTML_RE, (_m, doctype) => `${doctype}<html lang="pt-BR">`);
  patches.lang++;
}

// Patch 3: ESC bridge. capture:true fires BEFORE any internal React handler.
// When the HTML is embedded as an iframe (window.parent !== window), the parent
// receives postMessage({type: 'nuki-demo:esc'}) and leaves the demo. The window
// listener survives the body swap the loader performs.
//
// Do NOT rename 'nuki-demo:esc' — the deck listens for exactly this type.
const ESC_BRIDGE = `<script>
(function(){
  window.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && window.parent !== window) {
      e.preventDefault();
      try { window.parent.postMessage({ type: 'nuki-demo:esc' }, '*'); } catch(_){}
    }
  }, { capture: true });
})();
</script>`;

if (newHtml.includes("</head>")) {
  newHtml = newHtml.replace("</head>", () => `${ESC_BRIDGE}\n</head>`);
  patches.escBridge++;
} else {
  console.warn("[inspetor-demo] WARN: </head> not found, ESC bridge not injected");
}

console.log("[inspetor-demo] patches applied:", patches);

// The ESC bridge is the one load-bearing patch — without it, ESC from inside
// the iframe silently stops working.
if (patches.escBridge === 0) {
  throw new Error("[inspetor-demo] ESC bridge not injected — refusing to write a broken demo");
}

// Guard against the `$`-expansion regression: the output should only grow by
// roughly the patches we made, never by the size of the template payload.
const bloat = newHtml.length - html.length - ESC_BRIDGE.length;
if (bloat > 4096) {
  throw new Error(
    `[inspetor-demo] output grew ${bloat} chars beyond the expected patches — ` +
      "likely a `$` expansion in a replacement string (see Gotcha 1)",
  );
}

// Re-parse the template we are about to ship. A corrupted template still looks
// like valid HTML, so this is the only check that actually catches it.
const outMatch = newHtml.match(TEMPLATE_RE);
if (!outMatch) throw new Error("[inspetor-demo] template script tag missing from output");
try {
  JSON.parse(outMatch[1].trim());
} catch (err) {
  throw new Error(`[inspetor-demo] output template is not valid JSON: ${err.message}`);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, newHtml, "utf8");

const inputKB = (html.length / 1024).toFixed(0);
const outputKB = (newHtml.length / 1024).toFixed(0);
console.log(
  `[inspetor-demo] wrote ${OUT}\n              ${outputKB} KB output (input ${inputKB} KB source)`,
);
