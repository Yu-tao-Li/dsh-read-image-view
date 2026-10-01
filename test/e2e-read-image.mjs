// Headless e2e for the DSH 0.2 read_image row and in-page lightbox.
// Requires a running `dsh web` GUI with a session containing one settled
// read_image result and a system Edge installation.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "e2e-shots");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (...args) => console.log("[e2e]", ...args);
const GUI_URL = process.env.DSH_E2E_URL ?? "http://127.0.0.1:3080";
const SESSION_TEXT = process.env.DSH_E2E_SESSION ?? "我想问你问题";
const NATIVE_W = 320;
const NATIVE_H = 240;

const browser = await chromium.launch({ channel: "msedge", headless: true });
const mobile = process.env.DSH_E2E_MOBILE === "1";
const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1600, height: 1000 }, isMobile: mobile });
const pageErrors = [];
const consoleErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

try {
	await page.goto(GUI_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
	await page.waitForSelector("text=工作区", { timeout: 30000 });
	if (mobile) {
		const openSidebar = page.getByRole("button", { name: /打开侧边栏|展开侧边栏/ }).first();
		if (await openSidebar.isVisible().catch(() => false)) {
			await openSidebar.click();
			await sleep(500);
		}
	}
	if (mobile) {
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
		if (overflow) throw new Error("mobile shell has horizontal overflow");
	}
	await sleep(2000);
	const previewContinue = page.getByText("继续", { exact: true }).last();
	if (await previewContinue.isVisible().catch(() => false)) {
		await previewContinue.click();
		await sleep(500);
	}
	const configureLater = page.locator("text=稍后配置").last();
	if (await configureLater.isVisible().catch(() => false)) {
		await configureLater.click();
		await sleep(700);
	}
	let session = page.locator(`text=${SESSION_TEXT}`).first();
	const candidates = await session.isVisible().catch(() => false)
		? [session]
		: await page.getByText("未命名", { exact: true }).all();
	if (candidates.length === 0) throw new Error("target session is not visible");
	let visibleRowIndex = -1;
	for (const candidate of candidates) {
		console.log("candidate", candidates.indexOf(candidate));
		await candidate.click().catch(() => {});
		const sessionConfigureLater = page.getByText("稍后配置", { exact: true }).last();
		if (await sessionConfigureLater.isVisible().catch(() => false)) {
			await sessionConfigureLater.click();
			await sleep(700);
		}
		await sleep(5000);
		visibleRowIndex = await page.locator('[data-tool="read_image"]').evaluateAll((rows) => rows.findIndex((row) => row.offsetWidth > 0 && row.offsetHeight > 0));
		console.log("visible row index", visibleRowIndex);
		if (visibleRowIndex >= 0) break;
	}
	if (visibleRowIndex < 0) throw new Error("no visible read_image row after opening candidate sessions");
	if (mobile) {
		const closeSidebar = page.getByRole("button", { name: /收起侧边栏/ }).first();
		if (await closeSidebar.isVisible().catch(() => false)) {
			await closeSidebar.click();
			await sleep(500);
		}
	}
	const row = page.locator('[data-tool="read_image"]').nth(visibleRowIndex);
	await row.evaluate((element) => {
		for (let parent = element.parentElement; parent !== null; parent = parent.parentElement) {
			if (parent.hidden === "until-found") parent.hidden = false;
			if (getComputedStyle(parent).contentVisibility === "hidden") parent.style.contentVisibility = "visible";
		}
	});
	await row.evaluate((element) => element.scrollIntoView({ block: "center", inline: "nearest" }));
	await sleep(700);
	await row.waitFor({ state: "visible", timeout: 30000 });
	await row.scrollIntoViewIfNeeded();
	const frame = row.locator(".dri-frame").first();
	await frame.waitFor({ state: "visible", timeout: 30000 });
	const frameBg = await frame.evaluate((element) => getComputedStyle(element).backgroundImage);
	if (!frameBg.includes("repeating-conic-gradient")) throw new Error("checkerboard background missing");
	const loaded = await row.locator(".dri-frame img").evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0));
	if (!loaded) throw new Error("read_image frame did not load");
	await row.screenshot({ path: join(OUT, "shot-1-row.png") });
	const nativeSize = await frame.locator("img").evaluate((image) => ({ width: image.naturalWidth, height: image.naturalHeight }));
	await frame.click();
	const dialog = page.locator('[role="dialog"]');
	await dialog.waitFor({ state: "visible", timeout: 15000 });
	if (!(await row.isVisible())) throw new Error("row disappeared when lightbox opened");
	const dialogImage = dialog.locator("img");
	await dialogImage.waitFor({ state: "visible", timeout: 15000 });
	const firstPct = (await dialog.locator(".dri-lbPct").textContent()).trim();
	if (nativeSize.width === NATIVE_W && nativeSize.height === NATIVE_H && firstPct !== "100%") throw new Error(`expected 320x240 fixture to open at 100%, got ${firstPct}`);
	await dialogImage.screenshot({ path: join(OUT, "shot-2-lightbox.png") });
	await dialogImage.hover();
	await page.mouse.wheel(0, -300);
	await sleep(300);
	const wheelPct = (await dialog.locator(".dri-lbPct").textContent()).trim();
	if (wheelPct === firstPct) throw new Error("wheel zoom had no effect");
	await page.keyboard.press("Escape");
	await dialog.waitFor({ state: "hidden", timeout: 5000 });
	await row.locator("span", { hasText: "Read image" }).first().click();
	await sleep(300);
	if (await row.locator(".dri-frame").count() !== 0) throw new Error("frame remained visible after collapse");
	await row.screenshot({ path: join(OUT, "shot-3-collapsed.png") });
	await row.locator("span", { hasText: "Read image" }).first().click();
	await frame.waitFor({ state: "visible", timeout: 5000 });
	if (pageErrors.length > 0 || consoleErrors.length > 0) throw new Error(`browser errors: ${JSON.stringify({ pageErrors, consoleErrors })}`);
	if (mobile) {
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
		if (overflow) throw new Error("mobile read_image view has horizontal overflow");
		await page.screenshot({ path: join(OUT, "shot-4-mobile.png"), fullPage: true });
	}
	log("ALL CHECKS PASSED");
} finally {
	await browser.close();
}
