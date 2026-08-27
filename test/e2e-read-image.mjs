// Headless e2e: verify the dsh-read-image-view row UI in a real browser and
// produce clean element screenshots.
//
// Requires a running `dsh web` GUI with at least one settled read_image call
// in a session, plus playwright-core and a system Chrome/Edge:
//
//   npm i -D playwright-core
//   node test/e2e-read-image.mjs          # edits SESSION_TEXT to your session
//
// The script drives system Edge (channel "msedge") headlessly — no user
// windows are touched. Element screenshots are written to ./e2e-shots/.
//
// UI under test (v0.3.0): settled image rows are EXPANDED by default —
// no collapsed thumbnail. The expanded frame shows the image at the
// message-image single-fit size over the PS-style transparency
// checkerboard; clicking the frame opens the in-page zoom lightbox.
// Consecutive read_image calls merge into ONE "read N images" row with a
// wrapping grid of frames (checked softly when the demo session has a
// consecutive pair).
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
const SESSION_TEXT = "模型在查看图片的时候";
// Text that identifies the demo row's file path in the row summary
// (workspace-relative). The newest matching row is used.
const ROW_TEXT = "read-image-v020-demo.png";
// Expected natural size of that image (the e2e asserts 100% == native px).
const NATIVE_W = 640;
const NATIVE_H = 400;
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
			.locator(`[data-tool="read_image"]`, { hasText: ROW_TEXT })
			.first()
			.isVisible()
			.catch(() => false);
	}
}
if (!opened) throw new Error("could not open the target session / find the row");
log("session opened");

const row = page.locator('[data-tool="read_image"]', { hasText: ROW_TEXT }).last();
await row.scrollIntoViewIfNeeded();
await row.waitFor({ state: "visible", timeout: 15000 });

// No OS-open file link may exist on the row (regression: system viewer pop-up).
const fileLinks = await row.locator(".dri-fileLink").count();
log("fileLink count (expect 0):", fileLinks);
if (fileLinks !== 0) throw new Error("row still contains an openFile link");

// 1) Settled image rows are EXPANDED by default: the frame renders without
//    any click (no collapsed thumbnail in this version).
const frameImg = row.locator(".dri-frame img");
await frameImg.waitFor({ state: "visible", timeout: 15000 });
const frameComplete = await frameImg.evaluate((el) => el.complete && el.naturalWidth > 0);
log("frame loaded (expanded by default):", frameComplete);
if (!frameComplete) throw new Error("frame image not loaded");
// The frame background is the transparency checkerboard.
const frameBg = await row.locator(".dri-frame").evaluate((el) => getComputedStyle(el).backgroundImage);
log("frame checkerboard bg:", frameBg);
if (!frameBg.includes("repeating-conic-gradient")) throw new Error("checkerboard background missing");
await sleep(300);
await row.screenshot({ path: `${OUT}/shot-1-expanded.png` });
log("shot-1 (default-expanded frame) saved");

// 2) Click the frame -> IN-PAGE zoom lightbox; the row stays.
await row.locator(".dri-frame").click();
const dialog = page.locator('[role="dialog"]');
await dialog.waitFor({ state: "visible", timeout: 15000 });
await dialog.locator("img").waitFor({ state: "visible", timeout: 15000 });
const rowStillVisible = await row.isVisible();
log("lightbox open, row still present:", rowStillVisible);
if (!rowStillVisible) throw new Error("row vanished when lightbox opened");

// Backdrop: mask + blur (official modal look).
const backdropStyle = await dialog.evaluate((el) => {
	const cs = getComputedStyle(el);
	return { bg: cs.backgroundColor, blur: cs.backdropFilter };
});
log("backdrop mask:", backdropStyle.bg, "| blur:", backdropStyle.blur);
if (backdropStyle.blur === "none") throw new Error("backdrop blur missing");

// 3) Full-resolution semantics: at 100% the img is exactly NATIVE_W wide
//    (1:1 original pixels); small images open capped at 100% (fit, no upscale).
let pct = (await dialog.locator(".dri-lbPct").textContent()).trim();
log("initial zoom:", pct);
if (NATIVE_W <= 0.92 * 1600 && NATIVE_H <= 0.88 * 1000 && pct !== "100%") {
	throw new Error(`expected initial 100% (native fits), got ${pct}`);
}
const imgWidth100 = await dialog.locator("img").evaluate((el) => el.getBoundingClientRect().width);
log("img width at 100%:", imgWidth100, "(expect native)", NATIVE_W);
if (Math.abs(imgWidth100 - NATIVE_W) > 2) throw new Error(`img not at native 1:1 width (got ${imgWidth100})`);
await dialog.screenshot({ path: `${OUT}/shot-3-lightbox.png` });
log("shot-3 (lightbox @100% = original size) saved");

// 4) Wheel zoom over the image.
await dialog.locator("img").hover();
await page.mouse.wheel(0, -300);
await sleep(400);
const pctWheel = (await dialog.locator(".dri-lbPct").textContent()).trim();
log("zoom after wheel up:", pctWheel);
if (pctWheel === pct) throw new Error("wheel zoom had no effect");
const imgWidthZoomed = await dialog.locator("img").evaluate((el) => el.getBoundingClientRect().width);
log("img width when zoomed:", imgWidthZoomed);
if (imgWidthZoomed <= NATIVE_W) throw new Error("zoomed image is not larger than native");

// 5) Zoom-in button.
await dialog.getByRole("button", { name: "Zoom in" }).click();
await sleep(250);
const pctBtn = (await dialog.locator(".dri-lbPct").textContent()).trim();
log("zoom after + button:", pctBtn);
if (pctBtn === pctWheel) throw new Error("zoom-in button had no effect");
await dialog.screenshot({ path: `${OUT}/shot-4-zoomed.png` });
log("shot-4 (zoomed lightbox) saved");

// 6) 1:1 button returns to the original size.
await dialog.getByRole("button", { name: "Original size (100%)" }).click();
await sleep(250);
const pctOne = (await dialog.locator(".dri-lbPct").textContent()).trim();
const imgWidthOne = await dialog.locator("img").evaluate((el) => el.getBoundingClientRect().width);
log("after 1:1 button:", pctOne, "| width:", imgWidthOne);
if (pctOne !== "100%" || Math.abs(imgWidthOne - NATIVE_W) > 2) throw new Error("1:1 button did not restore native size");

// 7) Escape closes; the frame remains (no thumbnail in this version).
await page.keyboard.press("Escape");
await sleep(400);
const dialogGone = (await dialog.count()) === 0 || (await dialog.first().isVisible()) === false;
const frameStill = (await row.locator(".dri-frame img").count()) > 0;
log("lightbox closed by Esc:", dialogGone, "| frame still present:", frameStill);
if (!dialogGone) throw new Error("Escape did not close the lightbox");
if (!frameStill) throw new Error("frame vanished after lightbox close");

// 8) Collapse the row (header click) -> the frame hides, the summary shows;
//    expand again -> the frame returns.
await row.locator("span", { hasText: "Read image" }).first().click();
await sleep(500);
const collapsedFrameCount = await row.locator(".dri-frame img").count();
log("frame count while collapsed (expect 0):", collapsedFrameCount);
if (collapsedFrameCount !== 0) throw new Error("frame still visible while collapsed");
await row.screenshot({ path: `${OUT}/shot-2-collapsed.png` });
log("shot-2 (collapsed summary) saved");
await row.locator("span", { hasText: "Read image" }).first().click();
await sleep(500);
await frameImg.waitFor({ state: "visible", timeout: 15000 });
log("row re-expanded, frame back: true");

// 9) Frame click re-opens the lightbox (repeatable, not one-shot).
await frameImg.click();
await dialog.waitFor({ state: "visible", timeout: 15000 });
log("frame re-opens lightbox: true");
await page.keyboard.press("Escape");
await sleep(300);

// 10) CONSECUTIVE-READ GROUP (soft check): when the demo row's summary is a
//     "read N images" group label, the row must show exactly N frames in the
//     grid — and the rows of the group's other members must be empty.
const rowSummary = (await row.locator(".dri-summary").first().textContent().catch(() => "")) ?? "";
const groupMatch = /读取了\s*(\d+)\s*张图片|Read\s+(\d+)\s+images?/.exec(rowSummary);
if (groupMatch) {
	const n = Number(groupMatch[1] ?? groupMatch[2]);
	const gridFrames = await row.locator(".dri-grid .dri-frame").count();
	log(`group row: label says ${n}, grid frames: ${gridFrames}`);
	if (gridFrames < 1) throw new Error("group row has no grid frames");
	if (gridFrames !== n) throw new Error(`group grid has ${gridFrames} frames, label says ${n}`);
	// Non-lead members of the group render an empty (zero-height) row: the
	// visible read_image rows must not duplicate the group's own frames.
	await row.screenshot({ path: `${OUT}/shot-5-group.png` });
	log("shot-5 (grouped read-N-images row) saved");
} else {
	log("row summary is not a group label — skipping the group check");
}

log("ALL CHECKS PASSED");
await browser.close();
