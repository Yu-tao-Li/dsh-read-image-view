import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

test("DSH 0.2 client manifest injects the shipped client bundles", () => {
	assert.deepEqual(pkg.dsh.client.inject, [
		"@deepseek-ai/dsh-client-ui-renderer",
		"@deepseek-ai/dsh-client-ui-tool"
	]);
	assert.equal(pkg.dsh.client.platform, "web");
});

test("client bundle uses the DSH 0.2 tool-view and primitive contracts", () => {
	const source = readFileSync(join(root, "src", "client-src.js"), "utf8");
	assert.match(source, /function ImageRow\(\{ phase, toolName, block, cwd, inspect, t, loadImage, callId, useChat, useSession \}\)/);
	assert.match(source, /phase === "result" \? imageCardModel\(block\) : null/);
	assert.match(source, /IconBrowseOutlineRegular/);
	assert.match(source, /IconInspectOutlineRegular/);
	assert.match(source, /key: "read_image"[\s\S]{0,500}priority: -1/);
	assert.match(source, /useChat\(\(s\) => s\.legacy \?\? s\)/);
	assert.match(source, /useSession/);
	assert.match(source, /loadImage/);
	assert.doesNotMatch(source, /IconBrowseOutline16|IconInspectOutline12|attachmentLoader/);
});
