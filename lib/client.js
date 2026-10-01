window.__ModuleLoader__.load({
	id: "dsh-read-image-view",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		/**
 * dsh-read-image-view core: pure derivation and wire resolution for the
 * `read_image` tool result's image card. No DOM, no module-system
 * dependencies — unit-tested in Node (test/read-image-core.test.mjs).
 *
 * Background: the `read_image` tool persists its image through the durable
 * content-addressed attachment store and returns the bytes only as a
 * `sha256:` reference inside an `image` content part of the `tool/result`
 * event. The Web GUI previously flattened that part to pretty JSON. This
 * module turns the part into a render card (validated against the untrusted
 * wire shape), fetches the bytes back through the gateway's unary
 * `session/attachment` RPC — the same endpoint the runtime Session facade
 * uses, with the browser staying same-origin — and resolves the label
 * strings the `@deepseek-ai/dsh-client-ui-attachment` gallery atoms need.
 * @module dsh-read-image-view/read-image-core
 */

/**
 * Derive the image card for a settled tool result node, or null when the
 * result carries no usable image part and belongs on the text-only path.
 *
 * The content part is untrusted wire data: a version mismatch or a loose
 * producer could deliver a part with a missing or malformed `attachment`.
 * Any of those returns null so the row renders its text output instead of
 * crashing. Running calls have no `kind` field, so they are null. The raw
 * reference is passed through verbatim: the gallery atoms read its
 * `name`/`width`/`height` for sizing and labels.
 * @param {object} block - RunningToolCall or ToolResultNode off the snapshot caches.
 * @returns {{attachment: object, text: (string|undefined)}|null} the image card
 *   (the raw attachment reference plus the result's text envelope), or null.
 */
const IMAGE_MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function positiveInteger(value) {
	return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function parsedImageCall(block) {
	const call = block?.call;
	const name = call?.name ?? block?.name;
	const raw = call?.argsRaw ?? block?.argsRaw;
	if (name !== "read_image" || typeof raw !== "string") return null;
	try {
		const args = JSON.parse(raw);
		return typeof args === "object" && args !== null ? args : null;
	} catch {
		return null;
	}
}

function fullyRendered(content) {
	return Array.isArray(content) && content.every((part) => {
		if (typeof part !== "object" || part === null) return false;
		return part.type === "image" || part.type === "text" && typeof part.text === "string";
	});
}

function imageReference(part) {
	if (part?.type !== "image" || typeof part.attachment !== "object" || part.attachment === null) return null;
	const { attachmentId, mediaType, bytes, width, height, name, originalDimensions } = part.attachment;
	if (typeof attachmentId !== "string" || attachmentId === "") return null;
	if (!IMAGE_MEDIA_TYPES.has(mediaType) || !positiveInteger(bytes) || !positiveInteger(width) || !positiveInteger(height)) return null;
	if (name !== undefined && typeof name !== "string") return null;
	if (originalDimensions !== undefined
		&& (typeof originalDimensions !== "object" || originalDimensions === null
			|| !positiveInteger(originalDimensions.width) || !positiveInteger(originalDimensions.height))) return null;
	return part.attachment;
}

function imageCardModel(block) {
	if (typeof block !== "object" || block === null || block.kind !== "tool-result" || block.isError) return null;
	const args = parsedImageCall(block);
	if (typeof args?.file_path !== "string" || args.file_path.trim() === "") return null;
	if (!fullyRendered(block.content)) return null;
	const imageParts = block.content.filter((part) => part.type === "image");
	const references = imageParts.map(imageReference);
	if (references.length === 0 || references.some((value) => value === null)) return null;
	const attachment = references[0];
	const text = block.content
		.filter((part) => part.type === "text" && typeof part.text === "string")
		.map((part) => part.text)
		.join("\n");
	return { attachment, text: text === "" ? undefined : text };
}

/**
 * The (session, attachment) URL-cache key. Session ids and attachment ids
 * are opaque handles; neither contains the `/` separator in any shipped
 * shape, so the join is unambiguous.
 * @param {string} sessionId - the session the attachment belongs to.
 * @param {string} attachmentId - durable `sha256:` attachment id.
 * @returns {string} the cache key.
 */
function attachmentCacheKey(sessionId, attachmentId) {
	return `${sessionId}/${attachmentId}`;
}

/**
 * Generate an RFC 4122 version 4 UUID in both secure and insecure browser
 * contexts. `crypto.randomUUID()` is unavailable on LAN HTTP origins, while
 * `crypto.getRandomValues()` is still exposed there. The final fallback keeps
 * the RPC envelope usable in older runtimes that expose neither API; RPC ids
 * are correlation handles and must not be treated as secrets.
 * @returns {string} a UUID v4
 */
function randomUuid() {
	const cryptoApi = globalThis.crypto;
	if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
	const bytes = new Uint8Array(16);
	if (typeof cryptoApi?.getRandomValues === "function") {
		cryptoApi.getRandomValues(bytes);
	} else {
		for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
	}
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Resolve one session attachment into decoded image bytes through the
 * gateway's unary `session/attachment` endpoint.
 *
 * Wire protocol (same as the runtime Session facade): POST a
 * `client-request` envelope with `method: "session/attachment"` and Typert
 * Remote payload `{args: {request: {sessionId, attachmentId}}}` to
 * `/api/session/attachment`; the server
 * answers with a `server-response` envelope whose `result` is
 * `{ok: true, value: {attachment, data}}` with `data` base64-encoded, or
 * `{ok: false, error: {code, ...}}` when the id does not reference an image
 * in that session's durable log (authorization is session-scoped).
 *
 * The fetch implementation is dependency-injected so this stays unit-testable
 * in Node; the browser passes `globalThis.fetch`.
 * @param {string} sessionId - the session the attachment belongs to.
 * @param {object} attachment - the validated attachment reference.
 * @param {(input: string, init: object) => Promise<object>} fetchImpl - fetch-shaped function.
 * @returns {Promise<{bytes: Uint8Array, mediaType: string}>} the image bytes and media type.
 */
async function fetchAttachmentBytes(sessionId, attachment, fetchImpl) {
	const response = await fetchImpl("/api/session/attachment", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			type: "client-request",
			rpcId: randomUuid(),
			method: "session/attachment",
			payload: {
				args: {
					request: { sessionId, attachmentId: attachment.attachmentId }
				}
			}
		})
	});
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	const full = await response.json();
	const result = full?.result;
	if (result?.ok !== true) throw new Error(result?.error?.code ?? "attachment-error");
	const binary = atob(result.value.data);
	const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
	return { bytes, mediaType: result.value.attachment.mediaType };
}

/**
 * Resolve the chat-history image strings the gallery atoms need, from the
 * conversation locale namespace the row already seats. The keys are the
 * same dictionary entries the built-in user/assistant message images use,
 * so no new locale strings are introduced.
 * @param {(key: string, params?: object) => string} t - the conversation-namespace translate.
 * @returns the MessageImageLabels-shaped label set including lightbox strings.
 */
function imageGalleryLabels(t) {
	return {
		image: t("image.label"),
		open: t("image.openOriginal"),
		openNamed: (label) => t("image.openOriginalLabel", { label }),
		loading: t("image.loading"),
		loadFailed: t("image.loadFailed"),
		lightbox: {
			dialog: t("image.preview"),
			close: t("image.closePreview")
		}
	};
}

/**
 * Single-image display size, mirroring the official MessageImage rule:
 * 240px on the longer edge, displayed aspect ratio clamped to [0.25, 4]
 * (overflow cropped via object-fit: cover, anchored top for very tall
 * images / left for very wide), never upscaled past natural size.
 * @param {number} width - natural image width in px.
 * @param {number} height - natural image height in px.
 * @returns {{width: number, height: number, objectPosition: string}} the frame size.
 */
function singleFitSize(width, height) {
	const w = Number.isFinite(width) && width > 0 ? width : 240;
	const h = Number.isFinite(height) && height > 0 ? height : 240;
	const ratio = w / h;
	const clamped = Math.min(4, Math.max(0.25, ratio));
	const base = clamped >= 1 ? { width: 240, height: 240 / clamped } : { width: 240 * clamped, height: 240 };
	const scale = Math.min(1, w / base.width, h / base.height);
	return {
		width: Math.max(1, Math.round(base.width * scale)),
		height: Math.max(1, Math.round(base.height * scale)),
		objectPosition: ratio < 0.25 ? "center top" : ratio > 4 ? "left center" : "center"
	};
}

/**
 * Clamp a lightbox zoom scale to the supported range (1 = fit-to-viewport).
 * @param {number} scale - candidate scale.
 * @returns the clamped scale.
 */
function clampZoom(scale) {
	return Math.min(8, Math.max(0.2, Number.isFinite(scale) ? scale : 1));
}

/**
 * Clamp a lightbox zoom percentage (100 = 1:1 original pixels) to the
 * supported range.
 * @param {number} pct - candidate percentage.
 * @returns the clamped percentage (10–800).
 */
function clampZoomPct(pct) {
	return Math.min(800, Math.max(10, Number.isFinite(pct) ? pct : 100));
}

/**
 * Fit-to-viewport zoom percentage for an image of natural size w×h,
 * capped at 100 (the preview never upscales on open) and floored at 10.
 * @param {number} vw - viewport width in px.
 * @param {number} vh - viewport height in px.
 * @param {number} w - natural image width in px.
 * @param {number} h - natural image height in px.
 * @returns the fit percentage.
 */
function fitZoomPct(vw, vh, w, h) {
	if (!(w > 0) || !(h > 0)) return 100;
	return Math.max(10, Math.min(100, ((0.92 * vw) / w) * 100, ((0.88 * vh) / h) * 100));
}

/**
 * Group membership for read_image calls in one conversation window — the
 * "read N images" merged row.
 *
 * Rule: every read_image result that appears WITHIN ONE USER REQUEST is
 * merged into one row — the reads do NOT need to be back-to-back; other
 * tool calls and model text in between do not close the group. A group
 * closes only on a new user interaction / turn boundary:
 *
 * The caller reduces the ordered conversation nodes to `entries`:
 *   { kind: "read", callId } — a read_image tool node (settled result),
 *   { kind: "soft" }         — anything between user interactions that does
 *                              NOT close the group (assistant text /
 *                              reasoning, OTHER tool results, model retry),
 *   { kind: "break" }        — a user-interaction / turn boundary that
 *                              CLOSES the group (user message, steering,
 *                              command, context injection, turn error,
 *                              turn max-tokens, compaction, unknown).
 * `running` carries the ordered callIds of in-flight read_image calls from
 * the snapshot's runningCalls (they have no node yet); they join the group
 * open at the tail of the node list.
 *
 * @param entries - ordered group decisions (see above).
 * @param running - ordered callIds of in-flight read_image calls.
 * @param callId - the callId of the row rendering.
 * @returns { lead: boolean, position: number, members: string[] } for
 *   callId's group, or null when callId is absent from the window (the
 *   caller falls back to solo rendering).
 */
function readImageGroup(entries, running, callId) {
	// Ordered read list; a read opens a NEW group when a break sat since the
	// previous read (soft nodes keep the group open).
	const reads = [];
	let fresh = true; // nothing read yet → the first read opens a group
	for (const entry of entries) {
		if (entry.kind === "read") {
			reads.push({ callId: entry.callId, fresh });
			fresh = false;
		} else if (entry.kind === "break") {
			fresh = true;
		}
	}
	for (const cid of running) {
		reads.push({ callId: cid, fresh });
		fresh = false;
	}
	// Walk out callId's group boundaries: the group starts at the nearest
	// fresh (group-opening) read at or before i, and extends while the
	// following reads keep the group open.
	for (let i = 0; i < reads.length; i++) {
		if (reads[i].callId !== callId) continue;
		let start = i;
		while (start > 0 && !reads[start].fresh) start--;
		let end = i;
		while (end + 1 < reads.length && !reads[end + 1].fresh) end++;
		return {
			lead: i === start,
			position: i - start,
			members: reads.slice(start, end + 1).map((r) => r.callId)
		};
	}
	return null;
}

/**
 * The "Read N images" group label for the merged row's summary.
 *
 * The conversation dictionary has no plural-image key and the row already
 * ships the non-localized "Read image" title, so the label is composed from
 * a literal picked by the active locale (probed through the existing
 * image.label key). Follow-up: register a plugin-owned locale namespace
 * (dsh.client.inject + ctx.locale.register) for first-class i18n.
 * @param {(key: string, params?: object) => string} t - the conversation-namespace translate.
 * @param {number} count - image count in the group.
 * @returns the localized "read N images" label.
 */
function readImageGroupLabel(t, count) {
	const zh = String(t("image.label")).indexOf("图") !== -1;
	return zh ? `读取了 ${count} 张图片` : `Read ${count} image${count === 1 ? "" : "s"}`;
}


		//#region styles
		/**
		 * Row chrome: the same layout and design tokens as the built-in
		 * ToolRow (height, typography, ioCard, inspect button, running sweep),
		 * namespaced under `dri-` so the global stylesheet never collides.
		 * Plus the expanded frame, the "read N images" grid, and the zoom
		 * lightbox.
		 */
		const CSS = `.dri-root{flex-direction:column;display:flex}
.dri-row{position:relative;overflow:hidden}
.dri-root[data-state=running] .dri-row:after{content:"";background:linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent) 55%, transparent 100%);pointer-events:none;width:300px;animation:2.6s ease-out infinite dri-row-sweep;position:absolute;top:0;bottom:0;left:0}
@keyframes dri-row-sweep{0%{left:-300px}90%,to{left:100%}}
.dri-leading{flex-shrink:0}
.dri-chevron{color:var(--dsw-alias-label-secondary)}
.dri-title{font-weight:400}
.dri-sep{background:var(--dsw-alias-label-caption);border-radius:1px;flex:none;width:2px;height:2px;margin:0 8px}
.dri-summary{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary);flex:auto;font-size:14px;line-height:24px;overflow:hidden}
.dri-errorSummary{color:var(--dsw-alias-state-error-primary)}
.dri-bodyWrap{flex-direction:column;display:flex}
.dri-inspectButton{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:0;border-radius:999px;align-self:flex-start;align-items:center;gap:4px;margin:4px 0 2px 4px;padding:2px 8px;font-size:11px;line-height:16px;transition:opacity .1s;display:inline-flex}
.dri-root:hover .dri-inspectButton,.dri-inspectButton:focus-visible{opacity:1}
.dri-inspectButton:hover{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}
.dri-ioCard{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-markdown-code-block);font:var(--dsw-font-markdown-code-block-small);border-radius:12px;flex-direction:column;margin:4px 0 4px 4px;display:flex}
.dri-ioSection{grid-template-columns:max-content 1fr;align-items:baseline;column-gap:14px;max-height:150px;padding:12px 16px;display:grid;overflow-y:auto}
.dri-ioSection::-webkit-scrollbar-thumb{background-clip:padding-box;border:2px solid #0000;border-radius:6px}
.dri-ioSection::-webkit-scrollbar-track{margin:6px 0}
.dri-ioLabel{color:var(--dsw-alias-label-caption);align-self:start;position:sticky;top:0}
.dri-ioText{white-space:pre-wrap;word-break:break-word;min-width:0;color:var(--dsw-alias-label-secondary)}
.dri-ioText[data-error]{color:var(--dsw-alias-state-error-primary)}
.dri-visuallyHidden{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}
.dri-frame{cursor:zoom-in;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);border-radius:16px;/* PS-style gray/white transparency checkerboard: visible only through the image's transparent pixels. */background-color:#ffffff;background-image:repeating-conic-gradient(#d9d9d9 0% 25%,#ffffff 0% 50%);background-size:16px 16px;align-self:flex-start;flex:none;place-items:center;min-width:44px;min-height:44px;margin:4px 0 4px 4px;padding:0;display:grid;overflow:hidden}
.dri-frame:hover{border-color:var(--dsw-alias-label-secondary)}
.dri-frame img{display:block;width:100%;height:100%;object-fit:cover}
.dri-frameText{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13)}
.dri-grid{align-items:flex-start;flex-wrap:wrap;gap:8px;margin:4px 0 4px 4px;display:flex}
.dri-grid .dri-frame{margin:0}
.dri-gridTile{cursor:default;border:1px dashed var(--dsw-alias-border-l2);border-radius:16px;align-self:flex-start;align-items:center;flex:none;gap:8px;min-width:120px;max-width:240px;margin:0;padding:10px 14px;display:flex}
.dri-gridTileText{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font:var(--dsw-font-xs-13);overflow:hidden}
.dri-gridTile[data-state=error]{border-color:var(--dsw-alias-state-error-primary)}
.dri-gridTile[data-state=error] .dri-gridTileText{color:var(--dsw-alias-state-error-primary)}
.dri-lbBackdrop{position:fixed;inset:0;z-index:2147483000;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.45));-webkit-backdrop-filter:var(--dsw-mask-blur,blur(2px));backdrop-filter:var(--dsw-mask-blur,blur(2px));display:flex;align-items:center;justify-content:center;overflow:hidden}
.dri-lbStage{display:flex;align-items:center;justify-content:center;width:100%;height:100%}
.dri-lbImg{user-select:none;-webkit-user-drag:none;/* PS-style gray/white transparency checkerboard: visible only through the image's transparent pixels. */background-color:#ffffff;background-image:repeating-conic-gradient(#d9d9d9 0% 25%,#ffffff 0% 50%);background-size:16px 16px}
.dri-lbImg[data-pan]{cursor:grab}
.dri-lbImg[data-pan="dragging"]{cursor:grabbing}
.dri-lbBar{position:fixed;top:16px;right:16px;z-index:2147483001;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);border-radius:999px;align-items:center;display:flex}
.dri-lbBtn{cursor:pointer;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;line-height:20px;background:0 0;border:none;border-radius:999px;align-items:center;height:28px;min-width:28px;padding:0 8px;display:inline-flex}
.dri-lbBtn:hover{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}
.dri-lbPct{min-width:48px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:20px}`;
		const cssTagId = "dsh-read-image-view/read-image-row.css";
		if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css="${cssTagId}"]`) === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-read-image-view";
			tag.dataset.pluginCss = cssTagId;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}
		const css = {
			root: "dri-root",
			row: "dri-row",
			leading: "dri-leading",
			chevron: "dri-chevron",
			title: "dri-title",
			sep: "dri-sep",
			summary: "dri-summary",
			errorSummary: "dri-errorSummary",
			bodyWrap: "dri-bodyWrap",
			ioCard: "dri-ioCard",
			ioSection: "dri-ioSection",
			ioLabel: "dri-ioLabel",
			ioText: "dri-ioText",
			inspectButton: "dri-inspectButton",
			visuallyHidden: "dri-visuallyHidden",
			frame: "dri-frame",
			frameText: "dri-frameText",
			grid: "dri-grid",
			gridTile: "dri-gridTile",
			gridTileText: "dri-gridTileText",
			lbBackdrop: "dri-lbBackdrop",
			lbStage: "dri-lbStage",
			lbImg: "dri-lbImg",
			lbBar: "dri-lbBar",
			lbBtn: "dri-lbBtn",
			lbPct: "dri-lbPct"
		};
		//#endregion

		//#region row model
		function parseArgs(argsRaw) {
			try {
				return JSON.parse(argsRaw);
			} catch {
				return void 0;
			}
		}
		function firstLine(text) {
			const nl = text.indexOf("\n");
			return nl === -1 ? text : text.slice(0, nl);
		}
		function pickString(args, keys) {
			for (const key of keys) {
				const v = args[key];
				if (typeof v === "string" && v !== "") return v;
			}
		}
		/** Path keys only — never `url` (web_fetch lands on a different row). */
		const FILE_PATH_KEYS = ["path", "file_path"];
		/**
		 * Strip the workspace root from a workspace-rooted absolute path
		 * (display only), as the built-in rows do.
		 * @param text - the path to shorten.
		 * @param cwd - session workspace root.
		 */
		function relativizeToCwd(text, cwd) {
			if (cwd === void 0 || cwd === "") return text;
			const root = cwd.replace(/[/\\]+$/, "");
			if (text.startsWith(`${root}/`) || text.startsWith(`${root}\\`)) return text.slice(root.length + 1);
			return text;
		}
		/**
		 * Flatten a settled result's content blocks to display text: text
		 * blocks verbatim, other block shapes as pretty JSON. Image parts are
		 * skipped — they render as the real image. Empty content on a failed
		 * call falls back to the structured error's `name: code` line.
		 * @param block - the settled result node.
		 * @returns the flattened result text (may be null).
		 */
		function settledOutputText(block) {
			const parts = [];
			for (const p of block.content) {
				if (p.type === "image") continue;
				if (p.type === "text") parts.push(p.text);
				else parts.push(JSON.stringify(p, null, 2));
			}
			if (parts.length === 0 && block.error !== void 0) parts.push(`${block.error.name}: ${block.error.code}`);
			return parts.length === 0 ? null : parts.join("\n");
		}
		/**
		 * Reduce a conversation snapshot to the group decisions
		 * readImageGroup consumes: ordered read markers for the in-window
		 * read_image results; OTHER tool results, assistant text/thinking
		 * and model retries stay soft (a group is "read N images within one
		 * user request", not "back-to-back reads"); a group closes only on
		 * a new user interaction / turn boundary — user message, steering,
		 * command, context injection, turn error, turn max-tokens,
		 * compaction, or an unknown node. In-flight read_image calls
		 * (runningCalls — they have no node yet) come back as ordered
		 * callIds appended after the nodes.
		 * @param snap - the conversation snapshot (nodes + runningCalls).
		 * @returns {entries, running} for readImageGroup.
		 */
		function groupSnapshot(snap) {
			const entries = [];
			for (const n of snap.nodes ?? []) {
				if (n.kind === "tool-result") {
					// Other tools do NOT close the group — only user
					// interactions do ("出现的时候合并展示", not "连续读").
					entries.push(n.call?.name === "read_image"
						? { kind: "read", callId: n.callId }
						: { kind: "soft" });
				} else if (n.kind === "user" || n.kind === "steering" || n.kind === "command"
					|| n.kind === "context" || n.kind === "turn-error"
					|| n.kind === "turn-max-tokens" || n.kind === "compaction") {
					entries.push({ kind: "break" });
				} else {
					entries.push({ kind: "soft" });
				}
			}
			const running = (snap.runningCalls ?? [])
				.filter((c) => c.name === "read_image")
				.map((c) => c.callId);
			return { entries, running };
		}
		//#endregion

		//#region ZoomLightbox
		/**
		 * Document-level original-image preview with FULL-RESOLUTION zoom.
		 * Closes on Escape, backdrop click, or the close control; rendered
		 * through a body portal (a transformed ancestor would trap the fixed
		 * backdrop).
		 *
		 * Fidelity: the preview renders the original attachment bytes sized in
		 * real pixels — 100% means 1:1 original pixels (NOT fit-to-viewport).
		 * The img element carries explicit pixel width/height (native × scale)
		 * instead of a transform scale, so at ≥100% the browser re-rasterizes
		 * the original bitmap at that scale (crisp; no transform-upsample
		 * blur) and below 100% it is a high-quality downsample. The preview
		 * opens fitted to the viewport, capped at 100% (never upscaled on
		 * open). Zoom controls: − / + buttons (×/÷ 1.25), the mouse wheel
		 * (smooth exponential, clamped 10%–800%), and ⤢ fit-to-window.
		 * Drag pans while the displayed image overflows the stage. The
		 * backdrop uses the design-system mask + blur tokens (the official
		 * modal look — in dark themes the blur is what sells the modal).
		 * @param props - { src, alt, labels, width, height, onClose }
		 */
		function ZoomLightbox({ src, alt, labels, width, height, onClose }) {
			const [pct, setPct] = (0, react.useState)(null);
			const [pan, setPan] = (0, react.useState)({ x: 0, y: 0 });
			const [nat, setNat] = (0, react.useState)({ w: width, h: height });
			const imgRef = (0, react.useRef)(null);
			const backdropRef = (0, react.useRef)(null);
			const dragState = (0, react.useRef)(null);
			// Initial fit (capped at 100%); runs again if the natural size was
			// unknown at open and arrives via the img load event.
			(0, react.useEffect)(() => {
				if (nat.w > 0 && nat.h > 0 && pct === null) setPct(fitZoomPct(window.innerWidth, window.innerHeight, nat.w, nat.h));
			}, [nat, pct]);
			const onLoaded = (event) => {
				const img = event.currentTarget;
				if (img.naturalWidth > 0 && (nat.w <= 0 || nat.h <= 0)) {
					setNat({ w: img.naturalWidth, h: img.naturalHeight });
				}
			};
			// Wheel: non-passive so preventDefault stops the page behind from
			// scrolling; exponential factor for a smooth feel, clamped.
			(0, react.useEffect)(() => {
				const el = backdropRef.current;
				if (el === null) return;
				const onWheel = (event) => {
					event.preventDefault();
					const factor = Math.exp(-event.deltaY * 0.0022);
					setPct((p) => clampZoomPct((p ?? 100) * factor));
				};
				el.addEventListener("wheel", onWheel, { passive: false });
				return () => el.removeEventListener("wheel", onWheel);
			}, []);
			// Escape closes.
			(0, react.useEffect)(() => {
				const onKey = (event) => {
					if (event.key === "Escape") onClose();
				};
				document.addEventListener("keydown", onKey);
				return () => document.removeEventListener("keydown", onKey);
			}, [onClose]);
			const scale = (pct ?? 100) / 100;
			const dispW = nat.w > 0 ? nat.w * scale : 0;
			const dispH = nat.h > 0 ? nat.h * scale : 0;
			const overflows = dispW > 0.92 * window.innerWidth || dispH > 0.88 * window.innerHeight;
			// Drag-to-pan while the displayed image overflows the stage.
			const onPointerDown = (event) => {
				if (!overflows) return;
				if (event.button !== 0) return;
				event.preventDefault();
				dragState.current = { sx: event.clientX, sy: event.clientY, px: pan.x, py: pan.y };
				if (imgRef.current !== null) imgRef.current.dataset.pan = "dragging";
				const onMove = (move) => {
					if (dragState.current === null) return;
					setPan({
						x: dragState.current.px + (move.clientX - dragState.current.sx),
						y: dragState.current.py + (move.clientY - dragState.current.sy)
					});
				};
				const onUp = () => {
					dragState.current = null;
					if (imgRef.current !== null) delete imgRef.current.dataset.pan;
					window.removeEventListener("pointermove", onMove);
					window.removeEventListener("pointerup", onUp);
				};
				window.addEventListener("pointermove", onMove);
				window.addEventListener("pointerup", onUp);
			};
			const fit = () => {
				setPan({ x: 0, y: 0 });
				if (nat.w > 0 && nat.h > 0) setPct(fitZoomPct(window.innerWidth, window.innerHeight, nat.w, nat.h));
			};
			const btn = (label, title, onClick) => (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: css.lbBtn,
				title,
				"aria-label": title,
				onClick,
				children: label
			});
			return (0, react_dom.createPortal)(
				(0, react_jsx_runtime.jsxs)("div", {
					ref: backdropRef,
					className: css.lbBackdrop,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": labels.lightbox.dialog,
					onMouseDown: (event) => {
						// The stage covers the whole backdrop, so "empty area"
						// means "not the image or a control".
						if (!event.target.closest("img, button")) onClose();
					},
					children: [
						(0, react_jsx_runtime.jsx)("div", {
							className: css.lbStage,
							children: (0, react_jsx_runtime.jsx)("img", {
								ref: imgRef,
								src,
								alt,
								className: css.lbImg,
								"draggable": false,
								onLoad: onLoaded,
								"data-pan": overflows || void 0,
								// Real pixel sizing: at ≥100% the browser renders the
								// original bitmap at native scale (full resolution).
								style: nat.w > 0 ? { width: dispW, height: dispH, transform: `translate(${pan.x}px, ${pan.y}px)` } : { maxWidth: "92vw", maxHeight: "88vh" },
								onPointerDown: onPointerDown
							})
						}),
						(0, react_jsx_runtime.jsxs)("div", {
							className: css.lbBar,
							children: [
								btn("−", "Zoom out", () => setPct((p) => clampZoomPct((p ?? 100) / 1.25))),
								(0, react_jsx_runtime.jsx)("span", { className: css.lbPct, children: pct === null ? "…" : `${Math.round(pct)}%` }),
								btn("+", "Zoom in", () => setPct((p) => clampZoomPct((p ?? 100) * 1.25))),
								btn("⤢", "Fit to window", fit),
								btn("1:1", "Original size (100%)", () => { setPan({ x: 0, y: 0 }); setPct(100); }),
								btn("✕", labels.lightbox.close, onClose)
							]
						})
					]
				}),
				document.body
			);
		}
		//#endregion

		//#region ImageFrame
		/**
		 * One cached attachment URL as component state (the row's frame uses
		 * it). Resolves through the page-lifetime loader cache.
		 * @param attachment - validated attachment reference.
		 * @param load - the session's stable loader.
		 * @returns {url, failed, retry} for the render sites.
		 */
		function useAttachmentUrl(attachment, load) {
			const [url, setUrl] = (0, react.useState)(void 0);
			const [failed, setFailed] = (0, react.useState)(false);
			const [attempt, setAttempt] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				let live = true;
				setUrl(void 0);
				setFailed(false);
				load(attachment)
					.then((u) => {
						if (live) setUrl(u);
					})
					.catch(() => {
						if (live) setFailed(true);
					});
				return () => {
					live = false;
				};
			}, [attachment, load, attempt]);
			return { url, failed, retry: () => setAttempt((n) => n + 1) };
		}
		/**
		 * The expanded-row frame: the image at its single-fit size (240px
		 * long edge, ratio-clamped, never upscaled). Clicking opens the zoom
		 * lightbox. While the URL loads it shows the locale loading hint; a
		 * failed load shows the retry control.
		 */
		function ImageFrame({ attachment, load, labels, onOpen }) {
			const { url, failed, retry } = useAttachmentUrl(attachment, load);
			if (failed) {
				return (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: css.frameText,
					onClick: retry,
					children: labels.loadFailed
				});
			}
			if (url === void 0) {
				return (0, react_jsx_runtime.jsx)("span", {
					className: css.frameText,
					children: labels.loading
				});
			}
			const fit = singleFitSize(attachment.width, attachment.height);
			return (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: css.frame,
				title: labels.open,
				"aria-label": labels.openNamed(attachment.name ?? labels.image),
				// The frame is sized to the message-image single-fit box and the
				// img fills it (object-fit: cover), so the card shrink-wraps the
				// image instead of stretching to the row column width.
				style: {
					width: fit.width,
					height: fit.height
				},
				onClick: (event) => {
					event.stopPropagation();
					onOpen();
				},
				children: (0, react_jsx_runtime.jsx)("img", {
					src: url,
					alt: attachment.name ?? labels.image,
					"draggable": false,
					style: {
						objectPosition: fit.objectPosition
					}
				})
			});
		}
		//#endregion

		//#region ImageRow
		/**
		 * read_image row: icon + Read image · {path} in the shared disclosure
		 * chrome. A settled image result opens expanded by default so the
		 * picture shows at the message-image single-fit size (240px long edge)
		 * without a click — there is no tiny collapsed thumbnail. The path is
		 * PLAIN TEXT on purpose: opening the file with the OS default app (the
		 * host openFile action) would pop the system image viewer over the GUI,
		 * which users read as "the image left the page" — the in-page frame
		 * opens the in-page zoom lightbox instead. The expanded body shows the
		 * image at single-fit size (click → zoom lightbox); the Output metadata
		 * card appears only when the result has no image (text-only or a failed
		 * call), since an image result's text is just its redundant envelope.
		 * The lightbox zooms via control buttons and the mouse wheel, with
		 * drag-to-pan when zoomed.
		 * A failed call has no image part: the row surfaces the model-facing
		 * error text through its Output section and its first line in the
		 * collapsed summary.
		 *
		 * READ-N-IMAGES GROUPING: every read_image result that appears within
		 * one user request is merged into ONE row — not only back-to-back
		 * reads (other tool calls and model text between them do not split
		 * the group; only a new user message / steering / command / turn
		 * boundary does). The FIRST read of the request renders the merged
		 * row — summary "Read image · 读取了 N 张图片" (or the error line when
		 * no member has an image) — and the expanded body is a wrapping grid
		 * of one frame per member image; in-flight members show a dashed
		 * loading tile. The remaining members render null (the lead's grid
		 * covers the group). Grouping reads the 0.2 Chat snapshot's legacy
		 * compatibility slice; older hosts fall back to their session snapshot
		 * shape, and hosts without either hook render a solo row.
		 * @param props - DSH 0.2 ToolCallViewProps plus session standard props.
		 */
		function ImageRow({ phase, toolName, block, cwd, inspect, t, loadImage, callId, useChat, useSession }) {
			// read_image rows are expanded by default so the picture shows at
			// message-image size without a click. The row mounts while the call
			// is still running (imageBody is null then), so defaulting to true —
			// not to imageBody !== null — keeps it open once the result settles.
			const imageBody = phase === "result" ? imageCardModel(block) : null;
			const [expanded, setExpanded] = (0, react.useState)(true);
			// { url, attachment } so a group member opens ITS OWN lightbox.
			const [lightbox, setLightbox] = (0, react.useState)(void 0);
			const done = phase === "result";
			const argsRaw = (done ? block.call?.argsRaw : block.argsRaw) ?? "";
			const state = !done ? "running" : block.error?.code === "interrupted" ? "stopped" : block.isError ? "error" : "ok";
			const parsed = parseArgs(argsRaw);
			const isObj = typeof parsed === "object" && parsed !== null;
			const path = isObj ? pickString(parsed, FILE_PATH_KEYS) : void 0;
			const rawSummary = path ?? (isObj ? Object.values(parsed).find((v) => typeof v === "string" && v !== "") : argsRaw) ?? argsRaw;
			const summary = firstLine(relativizeToCwd(String(rawSummary), cwd));
			const output = done ? settledOutputText(block) : null;
			const errorSummary = state === "error" && output !== null ? firstLine(output) : null;
			// DSH 0.2 owns session authorization and the attachment URL lifecycle.
			const load = typeof loadImage === "function" ? loadImage : null;
			const labels = imageGalleryLabels(t);

			// DSH 0.2's session standard kit exposes this selector to every
			// session-scoped tool view through ui-session.
			const snap = typeof useChat === "function"
				? useChat((s) => s.legacy ?? s)
				: typeof useSession === "function" ? useSession((s) => s) : null;
			const group = (0, react.useMemo)(() => {
				if (snap === null || callId === void 0) return null;
				const { entries, running } = groupSnapshot(snap);
				return readImageGroup(entries, running, callId);
			}, [snap, callId]);
			const members = (0, react.useMemo)(() => {
				if (snap === null || group === null || !group.lead || group.members.length < 2) return null;
				const nodeById = new Map();
				for (const n of snap.nodes ?? []) if (n.kind === "tool-result") nodeById.set(n.callId, n);
				const runningById = new Map();
				for (const c of snap.runningCalls ?? []) if (c.name === "read_image") runningById.set(c.callId, c);
				return group.members.map((cid) => {
					const node = nodeById.get(cid);
					const src = node ?? runningById.get(cid) ?? null;
					if (src === null) return { callId: cid, state: "missing", attachment: null, tileText: null };
					const settled = node !== undefined;
					const mState = !settled ? "running"
						: node.error?.code === "interrupted" ? "stopped"
						: node.isError ? "error" : "ok";
					const attachment = settled ? imageCardModel(node)?.attachment ?? null : null;
					const text = settled ? settledOutputText(node) : null;
					const args = parseArgs(src.call?.argsRaw ?? src.argsRaw ?? "");
					const p = typeof args === "object" && args !== null ? pickString(args, FILE_PATH_KEYS) : void 0;
					return { callId: cid, state: mState, attachment, tileText: p !== void 0 ? relativizeToCwd(p, cwd) : firstLine(text ?? "") || null };
				});
			}, [snap, group, cwd]);
			if (group !== null && group.members.length > 1 && !group.lead) return null;
			const grouped = members !== null;
			const rowState = grouped
				? members.some((m) => m.state === "running") ? "running"
					: members.some((m) => m.state === "error") ? "error"
					: members.some((m) => m.state === "stopped") ? "stopped" : "ok"
				: state;
			const groupErrorLine = grouped ? members.find((m) => (m.state === "error" || m.state === "stopped") && m.tileText !== null)?.tileText ?? null : null;
			const groupLabel = grouped ? readImageGroupLabel(t, members.length) : null;
			const groupNoImages = grouped && members.every((m) => m.attachment === null);
			const failureLine = !grouped ? (state === "error" ? errorSummary ?? null : null) : null;
			const summaryText = grouped ? (groupNoImages && groupErrorLine !== null ? `${groupLabel} · ${groupErrorLine}` : groupLabel) : (failureLine ?? summary);
			const summaryErrorStyle = grouped ? groupNoImages && groupErrorLine !== null : failureLine !== null;
			const expandable = grouped ? members.some((m) => m.attachment !== null || m.state === "error" || m.state === "stopped") : output !== null || imageBody !== null;
			const open = expanded && expandable;
			const status = rowState === "running" ? t("row.running") : rowState === "error" ? t("row.failed") : rowState === "stopped" ? t("row.stopped") : null;
			const toggleExpand = () => {
				setExpanded((v) => !v);
			};
			const openLightboxFor = (attachment) => {
				if (attachment === null || load === null) return;
				load(attachment).then((url) => setLightbox({ url, attachment })).catch(() => {});
			};
			/** Leading-slot state substitution: the browse icon yields to the
			 *  terminal state semantic (error = red, interrupted = amber). */
			const icon = rowState === "error" ? (0, react_jsx_runtime.jsx)(primitives.StateDot, { state: "error" })
				: rowState === "stopped" ? (0, react_jsx_runtime.jsx)(primitives.StateDot, { state: "warning" })
				: (0, react_jsx_runtime.jsx)(primitives.IconBrowseOutlineRegular, { size: 14 });
			return (0, react_jsx_runtime.jsxs)("div", {
				className: css.root,
				"data-tool": toolName,
				"data-state": rowState,
				children: [
					status !== null && (0, react_jsx_runtime.jsx)("span", {
						className: css.visuallyHidden,
						children: status
					}),
					(0, react_jsx_runtime.jsx)(primitives.DisclosureRow, {
						rowClassName: css.row,
						leadingClassName: css.leading,
						titleClassName: css.title,
						chevronClassName: css.chevron,
						icon,
						// Figma design literal, not translatable copy (same posture as the built-in TOOL_TITLES).
						title: "Read image",
						open,
						expandable,
						expandOnRowClick: true,
						keepContentWhenOpen: true,
						onToggle: toggleExpand,
						collapsedContent: summaryText !== "" && [
							(0, react_jsx_runtime.jsx)("span", {
								className: css.sep,
								"aria-hidden": true
							}),
							// Plain text (NOT an openFile link): the host
							// openFile action launches the OS image viewer,
							// which covers the GUI — in-page viewing belongs to
							// the frame lightbox.
							(0, react_jsx_runtime.jsx)("span", {
								className: summaryErrorStyle ? `${css.summary} ${css.errorSummary}` : css.summary,
								children: summaryText
							})
						],
						children: (0, react_jsx_runtime.jsxs)("div", {
							className: css.bodyWrap,
							children: [
								grouped
									? (0, react_jsx_runtime.jsx)("div", {
										className: css.grid,
										children: members.map((m) => {
											if (m.state === "missing") return null;
											if (m.attachment !== null && load !== null) {
												return (0, react_jsx_runtime.jsx)(ImageFrame, {
													attachment: m.attachment,
													load,
													labels,
													onOpen: () => openLightboxFor(m.attachment)
												}, m.callId);
											}
											return (0, react_jsx_runtime.jsx)("div", {
												className: css.gridTile,
												"data-state": m.state,
												children: (0, react_jsx_runtime.jsx)("span", {
													className: css.gridTileText,
													children: m.tileText ?? labels.loading
												})
											}, m.callId);
										})
									})
									: (0, react_jsx_runtime.jsxs)(react.Fragment, {
										children: [
											imageBody !== null && load !== null && (0, react_jsx_runtime.jsx)(ImageFrame, {
												attachment: imageBody.attachment,
												load,
												labels,
												onOpen: () => openLightboxFor(imageBody.attachment)
											}),
											output !== null && imageBody === null && (0, react_jsx_runtime.jsxs)("div", {
												className: css.ioCard,
												children: [(0, react_jsx_runtime.jsxs)("div", {
													className: css.ioSection,
													children: [(0, react_jsx_runtime.jsx)("span", {
														className: css.ioLabel,
														children: "OUT"
													}), (0, react_jsx_runtime.jsx)("span", {
														className: css.ioText,
														"data-error": state === "error" || void 0,
														children: output
													})]
												})]
											})
										]
									}),
								inspect !== void 0 && (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: css.inspectButton,
									onClick: inspect,
									children: [(0, react_jsx_runtime.jsx)(primitives.IconInspectOutlineRegular, {}), "Inspect"]
								})]
						})
					}),
					lightbox !== void 0 && (0, react_jsx_runtime.jsx)(ZoomLightbox, {
						src: lightbox.url,
						alt: lightbox.attachment.name ?? labels.image,
						labels,
						width: lightbox.attachment.width,
						height: lightbox.attachment.height,
						onClose: () => setLightbox(void 0)
					})
				]
			});
		}
		//#endregion

		//#region apply
		/** Required service: the slot registry that owns the Tool render seats. */
		const inject = ["slots"];
		/**
		 * Mount the read_image row into the Tool-owned keyed view slot.
		 *
		 * The registration follows the same atomic toolview declaration the
		 * built-in rows use across independent activation and reload lifetimes.
		 * @param ctx - Client root context.
		 */
		function apply(ctx) {
			ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: "read_image",
				locale: "conversation",
				// DSH 0.2 selects the lowest priority for a keyed slot. The
				// built-in read_image row is priority 0; this plugin intentionally
				// shadows it when installed.
				priority: -1
			}, ImageRow));
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
