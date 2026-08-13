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
 *      The x-dc export has no such rail, so this is currently a no-op.
 *   2. Bundle the two real photos of the Portobello floor item (see PHOTOS
 *      below) as manifest entries and wire them into every surface that ships
 *      a grey "PLACEHOLDER" box for that item.
 *   3. Rewrite the outer document's <title> and <html lang>. The exporter emits
 *      a generic "Bundled Page" title and no lang.
 *   4. Inject the ESC bridge before </head>.
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
 *         src/HTML/assets/*.webp
 * Writes: public/demos/inspetor/index.html
 *
 * Usage:
 *   node scripts/prepare-inspetor-demo.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = join(ROOT, "src", "HTML", "Nuki-Inspetor-Embed.html");
const ASSETS = join(ROOT, "src", "HTML", "assets");
const OUT_DIR = join(ROOT, "public", "demos", "inspetor");
const OUT = join(OUT_DIR, "index.html");

// ── Photos bundled into the demo ──
// Path in the prototype: Reserva Atlântica › Torre A › Cobertura 1801 ›
// Sala de estar › Piso. The item is keyed by its `esp` string because that is
// what the component carries around; the same string also appears in
// Component.COZINHA12, which is a different screen and never renders these.
//
// These are NOT in public/ on purpose: the demo is a single self-contained
// document, so the bytes must ride inside the bundle manifest. A file under
// public/ would be a second HTTP request the exported HTML cannot make when it
// is opened outside the deck.
//
// The uuids are the bundler's own asset-reference mechanism: the loader does
// `template.split(uuid).join(blobUrls[uuid])` over the whole template string,
// so a bare uuid anywhere — markup attribute OR component source — becomes the
// blob: URL of the decoded manifest entry.
const ITEM_KEY = "Porcelanato Portobello Eternal 90×90";
const PHOTOS = {
  // "Especificado" — the reference the client approved.
  esp: { uuid: "b7e1c3a2-5d94-4f18-9c60-2ae4f81d33a1", file: "portobello-aeterna-avorio.webp" },
  // "Executado" — the photo taken on site.
  exe: { uuid: "c9f2d4b3-6ea5-4028-8d71-3bf5a92e44b2", file: "portobello-aeterna-avorio-ambiente.webp" },
};

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

const patches = { tweaks: 0, photos: 0, title: 0, lang: 0, escBridge: 0 };

let patched = template;

// Patch 1: strip TweaksPanel — the lazy match covers the whole JSX block.
const TWEAKS_RE = /<TweaksPanel>[\s\S]*?<\/TweaksPanel>/;
if (TWEAKS_RE.test(patched)) {
  patched = patched.replace(TWEAKS_RE, "");
  patches.tweaks++;
}

// ── Patch 2: real photos for the Portobello floor item ───────────────────────
//
// Every edit below is an *append* to an existing style attribute plus a
// `display:` swap on the grey placeholder label. Appending `background-image`
// after the element's own `background:` shorthand wins the cascade without
// touching the fallback colour, so items with no bundled photo keep the exact
// placeholder they ship with today. Nothing structural changes — no new
// elements, no new <sc-if>.
//
// Each entry must match EXACTLY ONCE. A silently-unmatched anchor is the
// failure mode this whole script exists to prevent, so a miss is fatal.
const PHOTO_FILL = "background-size:cover;background-position:center;background-repeat:no-repeat";
const VIEWER_FILL = "background-size:contain;background-position:center;background-repeat:no-repeat";

const TEMPLATE_PATCHES = [
  // ── "Especificado" tab: reference photo box ──
  {
    what: "esp tab · photo box",
    from: "position:relative;background:var(--color-gray-4);border:1px solid var(--color-gray-5);display:flex;align-items:center;justify-content:center",
    to: `position:relative;background:var(--color-gray-4);background-image:{{ fotoEspImg }};${PHOTO_FILL};border:1px solid var(--color-gray-5);display:flex;align-items:center;justify-content:center`,
  },
  {
    what: "esp tab · placeholder label",
    from: "display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--color-gray-7);padding-bottom:24px",
    to: "display:{{ fotoEspPh }};flex-direction:column;align-items:center;gap:4px;color:var(--color-gray-7);padding-bottom:24px",
  },

  // ── "Executado" tab: site photo box ──
  {
    what: "exe tab · photo box",
    from: "position:relative;background:#e4e4e4;border:1px solid var(--color-gray-5);display:flex;align-items:center;justify-content:center",
    to: `position:relative;background:#e4e4e4;background-image:{{ fotoExeImg }};${PHOTO_FILL};border:1px solid var(--color-gray-5);display:flex;align-items:center;justify-content:center`,
  },
  {
    what: "exe tab · placeholder label",
    from: "display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--color-gray-8);padding-bottom:24px",
    to: "display:{{ fotoExePh }};flex-direction:column;align-items:center;gap:4px;color:var(--color-gray-8);padding-bottom:24px",
  },

  // ── "Comparar em detalhe": the curtain. Executado is the base layer and the
  //    reference is clipped over it, so each layer takes its own photo. ──
  {
    what: "curtain · executado layer",
    from: "position:relative;border:1px solid var(--color-gray-5);background:#e4e4e4",
    to: `position:relative;border:1px solid var(--color-gray-5);background:#e4e4e4;background-image:{{ fotoExeImg }};${PHOTO_FILL}`,
  },
  {
    what: "curtain · executado label",
    from: "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--color-gray-8)",
    to: "position:absolute;inset:0;display:{{ fotoExePh }};align-items:center;justify-content:center;color:var(--color-gray-8)",
  },
  {
    what: "curtain · reference layer",
    from: "position:absolute;inset:0;background:var(--color-gray-4);display:flex;align-items:center;justify-content:center;color:var(--color-gray-7);clip-path:inset(0 {{ cortinaResto }} 0 0)",
    to: `position:absolute;inset:0;background:var(--color-gray-4);background-image:{{ fotoEspImg }};${PHOTO_FILL};display:flex;align-items:center;justify-content:center;color:var(--color-gray-7);clip-path:inset(0 {{ cortinaResto }} 0 0)`,
  },
  {
    // The reference layer itself carries the clip-path, so only its inner label
    // can be hidden — anchored on the icon that follows it, which is what makes
    // this one unique among the curtain's two identical label wrappers.
    what: "curtain · reference label",
    from: '<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><span class="ms" style="font-size:38px">image<',
    to: '<div style="display:{{ fotoEspPh }};flex-direction:column;align-items:center;gap:4px"><span class="ms" style="font-size:38px">image<',
  },

  // ── Fullscreen viewer ("Ampliar") — contain, not cover: this one is meant to
  //    be inspected, so nothing may be cropped out of frame. ──
  {
    what: "viewer · executado pane",
    from: '<div style="flex:1;min-width:0;display:flex;align-items:center;justify-content:center;position:relative">',
    to: `<div style="flex:1;min-width:0;display:flex;align-items:center;justify-content:center;position:relative;background-image:{{ fotoExeImg }};${VIEWER_FILL}">`,
  },
  {
    what: "viewer · executado label",
    from: "display:flex;flex-direction:column;align-items:center;gap:6px;color:rgba(255,255,255,.55)",
    to: "display:{{ fotoExePh }};flex-direction:column;align-items:center;gap:6px;color:rgba(255,255,255,.55)",
  },
  {
    what: "viewer · reference pane",
    from: "justify-content:center;position:relative;background:#232323",
    to: `justify-content:center;position:relative;background:#232323;background-image:{{ fotoEspImg }};${VIEWER_FILL}`,
  },
  {
    what: "viewer · reference label",
    from: "display:flex;flex-direction:column;align-items:center;gap:6px;color:rgba(255,255,255,.5)",
    to: "display:{{ fotoEspPh }};flex-direction:column;align-items:center;gap:6px;color:rgba(255,255,255,.5)",
  },

  // ── Component source: the uuid→blob table, the lookup, and the four props. ──
  {
    what: "component · photo table",
    from: "  static COMODOS = [",
    to:
      "  static FOTOS = {\n" +
      `    ${JSON.stringify(ITEM_KEY)}: { esp: "${PHOTOS.esp.uuid}", exe: "${PHOTOS.exe.uuid}" }\n` +
      "  };\n\n" +
      "  static COMODOS = [",
  },
  {
    // `it` (the selected item) is resolved a few lines above; hang the lookup
    // off the next statement so both stay in scope together.
    what: "component · photo lookup",
    from: "    const conf2 = this.state.confSel;",
    to:
      "    const itFoto = it ? Component.FOTOS[it.esp] || null : null;\n" +
      "    const conf2 = this.state.confSel;",
  },
  {
    what: "component · photo props",
    from: '      itEsp: it ? it.esp : "",',
    to:
      '      itEsp: it ? it.esp : "",\n' +
      '      fotoEspImg: itFoto ? "url(" + itFoto.esp + ")" : "none",\n' +
      '      fotoEspPh: itFoto ? "none" : "flex",\n' +
      '      fotoExeImg: itFoto ? "url(" + itFoto.exe + ")" : "none",\n' +
      '      fotoExePh: itFoto ? "none" : "flex",',
  },
];

for (const { what, from, to } of TEMPLATE_PATCHES) {
  const hits = patched.split(from).length - 1;
  if (hits !== 1) {
    throw new Error(
      `[inspetor-demo] anchor "${what}" matched ${hits} times, expected exactly 1 — ` +
        "the export changed; re-derive the anchor before shipping",
    );
  }
  patched = patched.split(from).join(to); // split/join, not replace — no `$` expansion
  patches.photos++;
}

let newHtml = html;

// Only re-inject the template when a patch actually changed it. Re-encoding an
// unchanged template is an identity transform that buys nothing and risks the
// `$`-expansion and `<\/`-escaping gotchas above for no reason.
let templateDelta = 0;
if (patches.tweaks > 0 || patches.photos > 0) {
  const encoded = JSON.stringify(patched).replace(/<\//g, "<\\/");
  templateDelta = encoded.length - match[1].trim().length;
  // Replacer FUNCTION, not a string — see Gotcha 1.
  newHtml = newHtml.replace(
    TEMPLATE_RE,
    () => `<script type="__bundler/template">${encoded}</script>`,
  );
} else {
  console.log("[inspetor-demo] no template patches applied — template passed through verbatim");
}

// ── Patch 2b: the photo bytes themselves, as manifest entries ────────────────
// Spliced in as text right after the manifest's opening brace rather than
// round-tripping a 5.5 MB JSON object: base64 cannot contain "<", so none of
// the `</`-escaping concerns that apply to the template apply here.
const MANIFEST_OPEN = '<script type="__bundler/manifest">';
const manifestAt = newHtml.indexOf(MANIFEST_OPEN);
if (manifestAt < 0) throw new Error("[inspetor-demo] manifest script tag not found");
const braceAt = newHtml.indexOf("{", manifestAt + MANIFEST_OPEN.length);
if (braceAt < 0) throw new Error("[inspetor-demo] manifest JSON object not found");

const manifestInsert = Object.values(PHOTOS)
  .map(({ uuid, file }) => {
    const data = readFileSync(join(ASSETS, file)).toString("base64");
    console.log(
      `[inspetor-demo] bundling ${file} as ${uuid} (${(data.length / 1024).toFixed(0)} KB base64)`,
    );
    return `${JSON.stringify(uuid)}:{"mime":"image/webp","compressed":false,"data":"${data}"},`;
  })
  .join("");

newHtml = newHtml.slice(0, braceAt + 1) + manifestInsert + newHtml.slice(braceAt + 1);

// Patch 3: outer document metadata. The exporter emits "<title>Bundled Page"
// and a bare <html>. Anchored to the doctype because the template carries a
// second <html> occurrence of its own.
const TITLE_RE = /<title>[^<]*<\/title>/;
if (TITLE_RE.test(newHtml)) {
  newHtml = newHtml.replace(TITLE_RE, () => "<title>Nuki Inspetor — Protótipo navegável</title>");
  patches.title++;
}

const ROOT_HTML_RE = /^(\s*<!DOCTYPE html>\s*)<html>/i;
if (ROOT_HTML_RE.test(newHtml)) {
  newHtml = newHtml.replace(ROOT_HTML_RE, (_m, doctype) => `${doctype}<html lang="pt-BR">`);
  patches.lang++;
}

// Patch 4: ESC bridge. capture:true fires BEFORE any internal React handler.
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

// Guard against the `$`-expansion regression: the output should grow by exactly
// what we injected, never by the size of the template payload. A fixed ceiling
// stopped being meaningful once the photos landed — the accounting is now
// explicit, so an unexpected 188 KB of spliced-in payload still trips it.
const expectedGrowth = templateDelta + manifestInsert.length + ESC_BRIDGE.length;
const bloat = newHtml.length - html.length - expectedGrowth;
if (Math.abs(bloat) > 4096) {
  throw new Error(
    `[inspetor-demo] output size is off by ${bloat} chars from the expected patches — ` +
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

// Same reasoning for the manifest: a bad splice leaves valid-looking HTML whose
// every asset — fonts, icons, React itself — silently fails to decode.
const outManifest = newHtml.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
if (!outManifest) throw new Error("[inspetor-demo] manifest script tag missing from output");
let parsedManifest;
try {
  parsedManifest = JSON.parse(outManifest[1].trim());
} catch (err) {
  throw new Error(`[inspetor-demo] output manifest is not valid JSON: ${err.message}`);
}
for (const { uuid, file } of Object.values(PHOTOS)) {
  if (!parsedManifest[uuid]) {
    throw new Error(`[inspetor-demo] ${file} missing from the output manifest (${uuid})`);
  }
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, newHtml, "utf8");

const inputKB = (html.length / 1024).toFixed(0);
const outputKB = (newHtml.length / 1024).toFixed(0);
console.log(
  `[inspetor-demo] wrote ${OUT}\n              ${outputKB} KB output (input ${inputKB} KB source)`,
);
