/**
 * dsh-read-image client bundle builder.
 *
 * Inlines lib/read-image-core.mjs (pure logic, unit-tested in Node) into
 * src/client-src.js at the /*__READ_IMAGE_CORE__*\/ placeholder, producing
 * the self-contained classic-script bundle lib/client.js that the web host
 * serves under /plugins/dsh-read-image/client.js.
 *
 * Usage:
 *   node scripts/build-client.mjs          # (re)write lib/client.js
 *   node scripts/build-client.mjs --check  # CI: fail if checked-in bundle drifted
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import process from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const src = readFileSync(join(root, "src", "client-src.js"), "utf8");
const core = readFileSync(join(root, "lib", "read-image-core.mjs"), "utf8")
	.replace(/^export (?=async function |function |const |let |var )/gm, "");

if (!src.includes("/*__READ_IMAGE_CORE__*/")) {
	console.error("build-client: placeholder /*__READ_IMAGE_CORE__*/ missing from src/client-src.js");
	process.exit(1);
}
const out = src.replace("/*__READ_IMAGE_CORE__*/", () => core);
const target = join(root, "lib", "client.js");

if (process.argv.includes("--check")) {
	const current = readFileSync(target, "utf8");
	if (current !== out) {
		console.error("build-client --check: lib/client.js is stale. Run `npm run build` and commit the result.");
		process.exit(1);
	}
	console.log("build-client: lib/client.js is in sync with src/ + lib/read-image-core.mjs");
} else {
	writeFileSync(target, out);
	console.log(`build-client: wrote ${target} (${out.length} bytes)`);
}
