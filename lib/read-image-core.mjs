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
 * `session.attachment` RPC — the same endpoint the runtime Session facade
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
export function imageCardModel(block) {
	if (!("kind" in block) || block.kind !== "tool-result") return null;
	for (const part of block.content) {
		if (part?.type !== "image") continue;
		const attachment = part.attachment;
		if (typeof attachment !== "object" || attachment === null) continue;
		const { attachmentId, mediaType } = attachment;
		if (typeof attachmentId !== "string" || attachmentId === "") continue;
		if (typeof mediaType !== "string" || !mediaType.startsWith("image/")) continue;
		const text = block.content
			.filter((p) => p.type === "text" && typeof p.text === "string")
			.map((p) => p.text)
			.join("\n");
		return { attachment, text: text === "" ? undefined : text };
	}
	return null;
}

/**
 * The (session, attachment) URL-cache key. Session ids and attachment ids
 * are opaque handles; neither contains the `/` separator in any shipped
 * shape, so the join is unambiguous.
 * @param {string} sessionId - the session the attachment belongs to.
 * @param {string} attachmentId - durable `sha256:` attachment id.
 * @returns {string} the cache key.
 */
export function attachmentCacheKey(sessionId, attachmentId) {
	return `${sessionId}/${attachmentId}`;
}

/**
 * Resolve one session attachment into decoded image bytes through the
 * gateway's unary `session.attachment` endpoint.
 *
 * Wire protocol (same as the runtime Session facade): POST a
 * `client-request` envelope with `method: "session.attachment"` and payload
 * `{sessionId, attachmentId}` to `/api/session.attachment`; the server
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
export async function fetchAttachmentBytes(sessionId, attachment, fetchImpl) {
	const response = await fetchImpl("/api/session.attachment", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			type: "client-request",
			rpcId: crypto.randomUUID(),
			method: "session.attachment",
			payload: { sessionId, attachmentId: attachment.attachmentId }
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
export function imageGalleryLabels(t) {
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
export function singleFitSize(width, height) {
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
export function clampZoom(scale) {
	return Math.min(8, Math.max(0.2, Number.isFinite(scale) ? scale : 1));
}

/**
 * Clamp a lightbox zoom percentage (100 = 1:1 original pixels) to the
 * supported range.
 * @param {number} pct - candidate percentage.
 * @returns the clamped percentage (10–800).
 */
export function clampZoomPct(pct) {
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
export function fitZoomPct(vw, vh, w, h) {
	if (!(w > 0) || !(h > 0)) return 100;
	return Math.max(10, Math.min(100, ((0.92 * vw) / w) * 100, ((0.88 * vh) / h) * 100));
}
