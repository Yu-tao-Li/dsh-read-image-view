[中文](README.md)

# dsh-read-image-view

[![CI](https://github.com/Yu-tao-Li/dsh-read-image-view/actions/workflows/ci.yml/badge.svg)](https://github.com/Yu-tao-Li/dsh-read-image-view/actions/workflows/ci.yml)
[![version](https://img.shields.io/github/v/release/Yu-tao-Li/dsh-read-image-view?label=version)](https://github.com/Yu-tao-Li/dsh-read-image-view/releases)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
![platform](https://img.shields.io/badge/platform-Web%20GUI-6E56CF)
[![stars](https://img.shields.io/github/stars/Yu-tao-Li/dsh-read-image-view?style=social)](https://github.com/Yu-tao-Li/dsh-read-image-view)

**Displays the images the `read_image` tool read, inside the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web GUI conversation flow.** After the model calls `read_image`, the conversation shows a dedicated **Read image** row: it is **expanded by default** as a message-style rounded image card (240px long edge) with a **PS-style gray/white transparency checkerboard**, and several images read in one request are **merged into a single side-by-side row** (`Read N images`). Clicking any image opens an **in-page** original-image lightbox (mask + frosted backdrop) with **zoom buttons, mouse-wheel zoom, and 1:1 original size** — 100% means 1:1 original pixels, and zooming stays crisp (real-pixel rendering, not scale-up interpolation).

A pure client-side plugin (browser-only), zero runtime dependencies, no changes to DSH itself.

| ① Merged row: images read in one request, side by side in a wrapping grid (`Read image · Read N images`) | ② Transparency: the PS-style checkerboard shows through the image's transparent pixels only |
|---|---|
| ![1](assets/screenshot-1.png) | ![2](assets/screenshot-2.png) |
| ③ In-page lightbox: 100% = original size; control bar − / % / + / fit / 1:1 / close | ④ Collapsed state: the summary carries the group label; click any image to re-expand |
| ![3](assets/screenshot-3.png) | ![4](assets/screenshot-4.png) |

## Background

The `read_image` tool persists its image into DSH's **content-addressed attachment store** (`$DSH_HOME/attachments/v1/objects/<sha256>`); the `tool/result` event carries only a durable `sha256:` reference plus metadata (`mediaType`/`width`/`height`/`bytes`/`name`). The Web GUI's generic tool row rendering flattened non-text content blocks to JSON — so users saw an attachment-reference JSON blob instead of the picture.

This plugin closes that gap: it extracts the attachment reference from the tool result, fetches the **original bytes** back through the gateway's existing `session/attachment` RPC (the same endpoint the runtime Session facade uses, same-origin, never re-compressed), and renders the image card, the multi-image grid, and the zoomable lightbox in the page.

## Features

- **Dedicated Read image row** — same chrome as the built-in Read row (browse icon, state dots, running sweep, expand/collapse).
- **Default-expanded image card** — no click needed: a settled result renders immediately in the **official message-image rule** (240px long edge, ratio-clamped, never upscaled past the original) inside a 16px-rounded, thin-bordered, checkerboard-backed card. The old 20px collapsed thumbnail is gone — it showed too little, and transparent images rendered as a dead white/black square.
- **Transparency checkerboard** — a PS-style gray/white checker (`repeating-conic-gradient`, 16px cells) as the backing of the image card and the lightbox, visible **only through the image's transparent pixels**: PNG transparency is obvious at a glance, opaque images are unaffected.
- **Merged "read N images" row** — every `read_image` result that appears within ONE user request merges into a single row: summary `Read image · Read N images`, and the expanded body is a **wrapping grid of one frame per image**; clicking a cell opens that image's own lightbox. Other tool calls and model text in between do NOT split the group — only a new user message / steering / command / turn boundary closes it. In-flight members show a dashed loading tile; failed members a compact text tile. Grouping is computed purely client-side (from the conversation snapshot via `useSession`) and renders once: non-lead members render empty.
- **In-page lightbox** — a body-portal fullscreen layer: design-system mask token (`--dsw-alias-bg-mask-1`) + frosted backdrop (`--dsw-mask-blur`, which is what makes it read as a modal in dark themes); transparent images keep the checkerboard in the lightbox; closes on Esc / empty-area click / ✕; **repeatable, not one-shot** (any grid frame re-opens it at any time).
- **Full-resolution zoom** — 100% = 1:1 original pixels (not "fit to viewport"); the img is sized in real pixels, so at ≥100% the browser re-rasterizes the original bitmap (crisp zoom) and below 100% it is a high-quality downsample; on open the image is fitted to the viewport but never upscaled past 100%.
- **Three ways to zoom** — **− / +** control-bar buttons (×/÷ 1.25), the **mouse wheel** (smooth exponential, clamped 10%–800%), and the **⤢ fit** / **1:1** buttons; drag pans while the displayed image overflows the stage.
- **Metadata envelope on demand** — text-only / error results still show the `<path>/<type>/<content>` envelope (media type, pixel size, byte count) in the OUT section; for image results the envelope text is redundant and hidden, leaving just the picture.
- **Error paths unchanged** — failed calls (missing file, image-incapable model, …) carry no image part: a solo row renders as an ordinary error row (red dot + error text), and a failed group member renders a compact text tile; a failed frame load shows a retry control.
- **No widened trust boundary** — image bytes only flow through the `session/attachment` endpoint, which authorizes per session (the reference must appear in that session's durable log); the plugin performs no file I/O and adds no network endpoints.
- **Graceful yielding** — registers the `tool.call.toolview` key `read_image` at `priority: 100`: if a future first-party renderer takes the key at a lower priority, it wins and this plugin stays registered but unrendered, with no conflict.

## Install

```powershell
# From GitHub (--profile selects the profile; use web for the Web GUI)
dsh plugin --profile web add github:Yu-tao-Li/dsh-read-image-view
# Or a local directory
dsh plugin --profile web add file:\<path>\dsh-read-image-view
```

Restart `dsh web` (profile plugin sets assemble at boot). From then on, every model `read_image` shows its picture directly in the conversation — and a multi-image request renders as one merged row.

## How it works

```
DSH Web GUI (browser)
  │  tool.call.toolview key "read_image" → this plugin's ImageRow
  │  │
  │  ├─ grouping: useSession reads the conversation snapshot (ordered nodes +
  │  │            runningCalls) → readImageGroup(): read_image results within
  │  │            one user request form one group (user messages / steering /
  │  │            commands / turn boundaries close the group; anything else does not)
  │  ├─ lead row: Read image · Read N images (default-expanded)
  │  │            └─ grid: one ImageFrame per member (240px-long-edge frame,
  │  │               checkerboard-backed; click → that image's in-page lightbox)
  │  ├─ solo row: Read image · <plain-text path> (default-expanded) + one ImageFrame
  │  └─ imageless members / solo errors: compact text tile / OUT metadata envelope
  │        │  load(attachment) → POST /api/session/attachment
  │        │  { type:"client-request", method:"session/attachment",
  │        │    payload:{ args:{ request:{ sessionId, attachmentId } } } }
  │        ▼
  │      gateway → attachment store (sha256 content-addressed)
  │        → { value:{ attachment, data(base64) } }
  │        │  base64 → Blob URL (original bytes, page-lifetime cache per (session, attachment))
  │        ▼
  │      ImageFrame / ZoomLightbox (react-dom portal to body,
  │      real-pixel sizing + mask/blur tokens + zoom control bar)
  ▼
shell-built-in modules: react / react-dom / dsh-client-ui-primitives (icons & state dots only)
```

The core logic (`lib/read-image-core.mjs`) is pure: content-part validation, RPC byte fetch (dependency-injected `fetch`, unit-testable in Node), cache keys, zoom/fit clamping (`clampZoomPct`/`fitZoomPct`), **multi-image grouping (`readImageGroup`) and the group label (`readImageGroupLabel`)**, and locale-key resolution. The browser bundle (`lib/client.js`) is generated by `scripts/build-client.mjs`, which inlines the core into `src/client-src.js`; CI checks the bundle stays in sync with its sources.

## Security and limitations

- **Read-only rendering** — the plugin only fetches and renders; no writes, no new network endpoints.
- **Session-authorized** — `session/attachment` serves only attachments referenced in that session's durable log; cross-session references are refused (`attachment-error`).
- **Memory** — Blob URLs are cached per (session, attachment) for the page lifetime (content-addressed, so repeated references fetch once); a page refresh releases them. Refresh to reclaim memory after very many large images.
- **Web GUI only** — the TUI and other surfaces are unaffected (tool-result data itself is unchanged).
- Depends on the shell-built-in `react` / `react-dom` / `dsh-client-ui-primitives` modules, the `image.*` locale keys, and the session standard kit (the `useSession` snapshot hook); if upstream changes the `tool.call.toolview` slot contract, the module loader table, or the conversation-snapshot shape, this needs a matching adaptation.
- Full-resolution semantics: 100% always means 1:1 original pixels; >100% is the browser upscaling the original bitmap (interpolated), as expected.

## Development

```
lib/read-image-core.mjs   core pure logic (unit-testable in Node)
src/client-src.js         browser bundle template (/*__READ_IMAGE_CORE__*/ placeholder)
scripts/build-client.mjs  build / --check (CI bundle-sync gate)
lib/client.js             built artifact (committed; no build authorization needed at install)
lib/index.js              no-op host half (loader entry)
cordis.patch.yml          profile patch layer (registers the loader entry)
test/read-image-core.test.mjs   unit tests (node --test)
test/e2e-read-image.mjs         real-browser e2e (headless Edge; writes e2e-shots/ screenshots)
docs/dev-notes.md         design decisions, debug notes
```

```powershell
npm run build    # regenerate lib/client.js
npm run check    # verify the bundle is in sync with src/ + core
npm test         # node --test (29 cases)
npm run e2e      # needs a running dsh web + playwright-core (devDependency) + system Edge
```

CI (`.github/workflows/ci.yml`) runs the bundle-sync check plus the unit tests on every push/PR; the e2e needs a live GUI, so it is a local regression script instead (the README screenshots were produced by it).

## License

MIT, see [LICENSE](LICENSE).
