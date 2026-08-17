/**
 * dsh-read-image core unit tests (Node, zero dependencies).
 *
 * Covers the wire-shape validation of imageCardModel, the session.attachment
 * RPC round-trip (dependency-injected fetch, base64 decode, error surfacing),
 * the cache-key shape, and the gallery label resolution.
 *
 * Run: node --test
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
	imageCardModel,
	attachmentCacheKey,
	fetchAttachmentBytes,
	imageGalleryLabels
} from "../lib/read-image-core.mjs";

/** A settled tool result node with one text part and one image part. */
function settledNode(parts, extra = {}) {
	return {
		kind: "tool-result",
		seq: 1,
		time: 0,
		callId: "call-1",
		call: { name: "read_image", argsRaw: '{"file_path":"x.png"}' },
		callTime: 0,
		content: parts,
		isError: false,
		...extra
	};
}

const VALID_ATTACHMENT = {
	attachmentId: "sha256:ab12cd34",
	mediaType: "image/png",
	bytes: 3721,
	width: 480,
	height: 320,
	name: "x.png"
};

const ENVELOPE = "<path>x.png</path>\n<type>image</type>\n<content>\nimage/png image, 480x320 px, 3721 bytes\n</content>";

test("imageCardModel: settled node with a valid image part", () => {
	const ref = { ...VALID_ATTACHMENT };
	const node = settledNode([
		{ type: "text", text: ENVELOPE },
		{ type: "image", attachment: ref }
	]);
	const card = imageCardModel(node);
	assert.ok(card !== null);
	assert.equal(card.attachment, ref); // raw reference passed through verbatim
	assert.equal(card.text, ENVELOPE);
});

test("imageCardModel: running call (no kind) is null", () => {
	const running = {
		callId: "call-1",
		name: "read_image",
		argsRaw: '{"file_path":"x.png"}',
		turn: 0,
		step: 0,
		time: 0,
		subCalls: []
	};
	assert.equal(imageCardModel(running), null);
});

test("imageCardModel: settled node without an image part is null", () => {
	const node = settledNode([{ type: "text", text: "plain output" }]);
	assert.equal(imageCardModel(node), null);
});

test("imageCardModel: malformed attachment shapes are null", () => {
	assert.equal(imageCardModel(settledNode([{ type: "image" }])), null);
	assert.equal(imageCardModel(settledNode([{ type: "image", attachment: null }])), null);
	assert.equal(imageCardModel(settledNode([{ type: "image", attachment: { attachmentId: "", mediaType: "image/png" } }])), null);
	assert.equal(imageCardModel(settledNode([{ type: "image", attachment: { attachmentId: 42, mediaType: "image/png" } }])), null);
	assert.equal(imageCardModel(settledNode([{ type: "image", attachment: { attachmentId: "sha256:x", mediaType: "application/pdf" } }])), null);
	assert.equal(imageCardModel(settledNode([{ type: "image", attachment: { attachmentId: "sha256:x" } }])), null);
});

test("imageCardModel: non tool-result kind is null", () => {
	const node = { kind: "assistant", content: [{ type: "image", attachment: { ...VALID_ATTACHMENT } }] };
	assert.equal(imageCardModel(node), null);
});

test("imageCardModel: text envelope joins text parts; empty text is undefined", () => {
	const joined = imageCardModel(settledNode([
		{ type: "text", text: "a" },
		{ type: "image", attachment: { ...VALID_ATTACHMENT } },
		{ type: "text", text: "b" }
	]));
	assert.equal(joined.text, "a\nb");
	const noText = imageCardModel(settledNode([
		{ type: "image", attachment: { ...VALID_ATTACHMENT } }
	]));
	assert.equal(noText.text, undefined);
});

test("imageCardModel: first valid image part wins over later text-only parts", () => {
	const card = imageCardModel(settledNode([
		{ type: "text", text: ENVELOPE },
		{ type: "image", attachment: { ...VALID_ATTACHMENT } },
		{ type: "image", attachment: { attachmentId: "sha256:other", mediaType: "image/gif" } }
	]));
	assert.equal(card.attachment.attachmentId, "sha256:ab12cd34");
});

test("attachmentCacheKey: joins session and attachment id", () => {
	assert.equal(attachmentCacheKey("sess-1", "sha256:ab"), "sess-1/sha256:ab");
});

/** A fetch-shaped fake answering the session.attachment unary call. */
function fakeFetch(handler) {
	const calls = [];
	const fn = async (input, init) => {
		calls.push({ input, init });
		return handler(calls.length - 1);
	};
	return { fn, calls };
}

test("fetchAttachmentBytes: ok path decodes base64 and verifies the wire envelope", async () => {
	const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic
	const b64 = Buffer.from(bytes).toString("base64");
	const { fn, calls } = fakeFetch(() => ({
		ok: true,
		status: 200,
		json: async () => ({
			type: "server-response",
			rpcId: "rpc-1",
			result: {
				ok: true,
				value: {
					attachment: { attachmentId: "sha256:ab", mediaType: "image/png", bytes: bytes.length, width: 1, height: 1 },
					data: b64
				}
			}
		})
	}));
	const { bytes: out, mediaType } = await fetchAttachmentBytes("sess-1", VALID_ATTACHMENT, fn);
	assert.deepEqual([...out], [...bytes]);
	assert.equal(mediaType, "image/png");
	// Wire envelope: same-origin path, POST, client-request with the unary method.
	assert.equal(calls[0].input, "/api/session.attachment");
	assert.equal(calls[0].init.method, "POST");
	const body = JSON.parse(calls[0].init.body);
	assert.equal(body.type, "client-request");
	assert.equal(body.method, "session.attachment");
	assert.equal(body.payload.sessionId, "sess-1");
	assert.equal(body.payload.attachmentId, "sha256:ab12cd34");
	assert.ok(typeof body.rpcId === "string" && body.rpcId.length > 0);
});

test("fetchAttachmentBytes: non-2xx HTTP surfaces as an error", async () => {
	const { fn } = fakeFetch(() => ({ ok: false, status: 500, json: async () => ({}) }));
	await assert.rejects(
		() => fetchAttachmentBytes("sess-1", VALID_ATTACHMENT, fn),
		/HTTP 500/
	);
});

test("fetchAttachmentBytes: business ok:false surfaces the error code", async () => {
	const { fn } = fakeFetch(() => ({
		ok: true,
		status: 200,
		json: async () => ({
			type: "server-response",
			rpcId: "rpc-2",
			result: { ok: false, error: { code: "attachment-error", message: "not in log" } }
		})
	}));
	await assert.rejects(
		() => fetchAttachmentBytes("sess-1", VALID_ATTACHMENT, fn),
		/attachment-error/
	);
});

test("fetchAttachmentBytes: malformed envelope falls back to attachment-error", async () => {
	const { fn } = fakeFetch(() => ({
		ok: true,
		status: 200,
		json: async () => ({ type: "server-response", rpcId: "rpc-3", result: null })
	}));
	await assert.rejects(
		() => fetchAttachmentBytes("sess-1", VALID_ATTACHMENT, fn),
		/attachment-error/
	);
});

test("imageGalleryLabels: resolves the conversation image.* keys", () => {
	const calls = [];
	const t = (key, params) => {
		calls.push([key, params]);
		return `<${key}>`;
	};
	const labels = imageGalleryLabels(t);
	assert.equal(labels.image, "<image.label>");
	assert.equal(labels.open, "<image.openOriginal>");
	assert.equal(labels.loading, "<image.loading>");
	assert.equal(labels.loadFailed, "<image.loadFailed>");
	assert.equal(labels.lightbox.dialog, "<image.preview>");
	assert.equal(labels.lightbox.close, "<image.closePreview>");
	assert.equal(labels.openNamed("x.png"), "<image.openOriginalLabel>");
	assert.deepEqual(calls.at(-1), ["image.openOriginalLabel", { label: "x.png" }]);
});
