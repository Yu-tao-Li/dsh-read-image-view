// Headless e2e: verify the dsh-read-image-view "read N images" grouped row
// UI in a real browser and produce clean element screenshots.
//
// Requires a running `dsh web` GUI with a session containing multiple
// read_image results in one user request, plus playwright-core and a
// system Chrome/Edge:
//
//   npm i -D playwright-core
//   node test/e2e-read-image.mjs          # edits SESSION_TEXT to your session
//
// The script drives system Edge (channel "msedge") headlessly — no user
// windows are touched. Element screenshots are written to ./e2e-shots/.
//
// UI under test (v0.3.x): every read_image result that appears within ONE
// USER REQUEST merges into a single row — summary "Read image · 读取了 N
// 张图片" — whose expanded body is a wrapping grid of one frame per member
// image (PS-style transparency checkerboard, default-expanded). Clicking a
// frame opens that image's in-page zoom lightbox (100% == native pixels,
// wheel zoom, 1:1). Non-lead members of the group render nothing.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "e2e-shots");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[e2e]", ...a);

// --- configuration ---------------------------------------------------------
const GUI_URL = "http://127.0.0.1:3080";
// Text that identifies YOUR session in the sidebar (unique substring).
const SESSION_TEXT = "我想问你问题";
// Natural size of the synthetic transparency test image in the session
// (used to assert lightbox 100% == native px on the matching frame).
const NATIVE_W = 320;
const NATIVE_H = 240;
// ---------------------------------------------------------------------------

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

page.on("pageerror", (err) => log("PAGE ERROR:", err.message));
page.on("console", (msg) => {
	if (msg.type() === "error") log("CONSOLE ERROR:", msg.text().slice(0, 300));
});

log("goto GUI");
await page.goto(GUI_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector("text=工作区", { timeout: 30000 });
await sleep(2000);
log("app shell up");

// Open the target session (expand its workspace group first if collapsed).
const wsGroup = page.locator("text=qwen3.8-27B").first();
const sessionItem = page.locator(`text=${SESSION_TEXT}`).first();
let opened = false;
for (let attempt = 0; attempt < 4 && !opened; attempt++) {
	const visible = await sessionItem.isVisible().catch(() => false);
	if (!visible) {
		await wsGroup.scrollIntoViewIfNeeded().catch(() => {});
		await wsGroup.click().catch(() => {});
		await sleep(800);
	}
	if (await sessionItem.isVisible().catch(() => false)) {
		await sessionItem.scrollIntoViewIfNeeded();
		await sessionItem.click();
		await sleep(3000);
		opened = await page
			.locator('[data-tool="read_image"]')
			.first()
			.isVisible()
			.catch(() => false);
	}
}
if (!opened) throw new Error("could not open the target session / find read_image rows");
log("session opened");

// --- 1) find the cleanest GROUP row ("读取了 N 张图片") --------------------
// The FIRST group row in the session is the synthetic test-image pair
// (privacy-clean frames — the screenshots below become plugin assets);
// later group rows contain conversation screenshots and are assertion-only.
const groupRows = page.locator('[data-tool="read_image"]', { hasText: "读取了" });
const groupRow = groupRows.first();
await groupRow.scrollIntoViewIfNeeded();
await groupRow.waitFor({ state: "visible", timeout: 15000 });

const rowSummary = (await groupRow.locator(".dri-summary").first().textContent()) ?? "";
const m = /读取了\s*(\d+)\s*张图片|Read\s+(\d+)\s+images?/.exec(rowSummary);
if (!m) throw new Error(`group row summary has no N-count: "${rowSummary}"`);
const n = Number(m[1] ?? m[2]);
log(`group row: "${rowSummary}" → N = ${n}`);

// The row is default-expanded: the grid renders N cells (frames + tiles).
const gridCells = groupRow.locator(".dri-grid > *");
await gridCells.first().waitFor({ state: "visible", timeout: 15000 });
await sleep(800); // let member images load
const cellCount = await gridCells.count();
const frameCount = await groupRow.locator(".dri-grid .dri-frame").count();
const tileCount = await groupRow.locator(".dri-grid .dri-gridTile").count();
log(`grid cells: ${cellCount} (frames: ${frameCount} + tiles: ${tileCount}), label N = ${n}`);
if (cellCount !== n) throw new Error(`grid has ${cellCount} cells, label says ${n}`);
if (frameCount < 1) throw new Error("group grid has no image frames");

// No OS-open file link may exist (regression: system viewer pop-up).
const fileLinks = await groupRow.locator(".dri-fileLink").count();
if (fileLinks !== 0) throw new Error("group row contains an openFile link");

// Frames: checkerboard background + loaded images.
const firstFrame = groupRow.locator(".dri-grid .dri-frame").first();
const frameBg = await firstFrame.evaluate((el) => getComputedStyle(el).backgroundImage);
log("frame checkerboard bg:", frameBg);
if (!frameBg.includes("repeating-conic-gradient")) throw new Error("checkerboard background missing");
const loaded = await groupRow.locator(".dri-grid .dri-frame img").evaluateAll(
	(imgs) => imgs.every((el) => el.complete && el.naturalWidth > 0)
);
log("all group frames loaded:", loaded);
if (!loaded) throw new Error("a group frame image did not load");
await groupRow.screenshot({ path: `${OUT}/shot-1-group.png` });
log("shot-1 (grouped read-N-images row) saved");

// --- 2) click a frame -> its OWN lightbox ---------------------------------
// Prefer the synthetic 320x240 test image so the 1:1 assertion is exact.
const frames = groupRow.locator(".dri-grid .dri-frame");
let clickIndex = 0;
let isTestImage = false;
{
	const natWidths = await groupRow.locator(".dri-grid .dri-frame img").evaluateAll(
		(imgs) => imgs.map((el) => el.naturalWidth)
	);
	const idx = natWidths.indexOf(NATIVE_W);
	if (idx !== -1) {
		clickIndex = idx;
		isTestImage = true;
	}
}
log(`clicking grid frame #${clickIndex}${isTestImage ? " (320x240 test image)" : ""}`);
await frames.nth(clickIndex).click();
const dialog = page.locator('[role="dialog"]');
await dialog.waitFor({ state: "visible", timeout: 15000 });
await dialog.locator("img").waitFor({ state: "visible", timeout: 15000 });
const rowStillVisible = await groupRow.isVisible();
log("lightbox open, group row still present:", rowStillVisible);
if (!rowStillVisible) throw new Error("group row vanished when lightbox opened");

// Backdrop: mask + blur (official modal look).
const backdropStyle = await dialog.evaluate((el) => {
	const cs = getComputedStyle(el);
	return { bg: cs.backgroundColor, blur: cs.backdropFilter };
});
log("backdrop mask:", backdropStyle.bg, "| blur:", backdropStyle.blur);
if (backdropStyle.blur === "none") throw new Error("backdrop blur missing");

// 1:1 semantics: the 320x240 test image opens capped at 100% and renders
// exactly NATIVE_W wide (native pixels, no upscale).
const dialogNatW = await dialog.locator("img").evaluate((el) => el.naturalWidth);
const dialogNatH = await dialog.locator("img").evaluate((el) => el.naturalHeight);
const pct = (await dialog.locator(".dri-lbPct").textContent()).trim();
log("lightbox initial zoom:", pct, "| img natural:", dialogNatW, "x", dialogNatH);
if (isTestImage && dialogNatW === NATIVE_W && dialogNatH === NATIVE_H) {
	const imgWidth100 = await dialog.locator("img").evaluate((el) => el.getBoundingClientRect().width);
	log("img width at 100%:", imgWidth100, "(expect native)", NATIVE_W);
	if (pct !== "100%" || Math.abs(imgWidth100 - NATIVE_W) > 2) {
		throw new Error(`expected 100% == native ${NATIVE_W}px, got ${pct} / ${imgWidth100}px`);
	}
}
// Privacy-clean asset: capture the lightbox IMG element only (no blurred
// conversation background behind it).
await dialog.locator("img").screenshot({ path: `${OUT}/shot-2-lightbox.png` });
log("shot-2 (lightbox image) saved");

// Wheel zoom works on the lightbox image.
await dialog.locator("img").hover();
await page.mouse.wheel(0, -300);
await sleep(400);
const pctWheel = (await dialog.locator(".dri-lbPct").textContent()).trim();
log("zoom after wheel up:", pctWheel);
if (pctWheel === pct) throw new Error("wheel zoom had no effect");

// Escape closes; the group row and its grid remain.
await page.keyboard.press("Escape");
await sleep(400);
const dialogGone = (await dialog.count()) === 0 || (await dialog.first().isVisible()) === false;
const framesStill = await groupRow.locator(".dri-grid .dri-frame").count();
log("lightbox closed by Esc:", dialogGone, "| grid frames still present:", framesStill);
if (!dialogGone) throw new Error("Escape did not close the lightbox");
if (framesStill !== frameCount) throw new Error("grid frames changed after lightbox close");

// --- 3) collapse / re-expand the group row --------------------------------
await groupRow.locator("span", { hasText: "Read image" }).first().click();
await sleep(500);
const collapsedCells = await groupRow.locator(".dri-grid > *").count();
log("grid cells while collapsed (expect 0):", collapsedCells);
if (collapsedCells !== 0) throw new Error("grid still visible while collapsed");
await groupRow.screenshot({ path: `${OUT}/shot-3-collapsed.png` });
log("shot-3 (collapsed group row) saved");
await groupRow.locator("span", { hasText: "Read image" }).first().click();
await sleep(500);
const reExpanded = await groupRow.locator(".dri-grid .dri-frame").count();
if (reExpanded !== frameCount) throw new Error("re-expand did not restore the grid");
log("group row re-expanded, grid restored: true");

// --- 4) non-lead members render nothing (soft check) -----------------------
const allReadRows = await page.locator('[data-tool="read_image"]').count();
const rowsWithFrames = await page.locator('[data-tool="read_image"]:has(.dri-frame)').count();
log(`read_image rows: ${allReadRows}, rows with frames: ${rowsWithFrames} (non-lead rows render empty)`);

log("ALL CHECKS PASSED");
await browser.close();
