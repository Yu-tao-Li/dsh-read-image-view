// One-shot release for dsh-read-image-view.
//
// Usage:   node scripts/release.mjs <new-version> ["release notes (optional)"]
// Example: node scripts/release.mjs 0.3.1 "fix: grid gap on narrow rows"
//
// What it does (in order, aborting on the first failure):
//   1. verify the working tree is clean (commit your feature work first)
//   2. gate: bundle sync check (build-client.mjs --check) + all unit tests
//   3. bump package.json version and commit "release: vX.Y.Z"
//   4. push to origin main
//   5. create the GitHub release (tag vX.Y.Z) via the API
//   6. npm publish (must be logged in: `npm whoami`)
//
// The GitHub token is read from the DSH_GITHUB_TOKEN env var, or from
// E:\PythonFiles\.secrets\github-token-computer-use-win.txt by default.
//
// UI-only or description changes are NOT part of this script: update
// README / publish/awesome-list-entry.yml / assets first (screenshots come
// from `npm run e2e`), commit those, THEN run the release. A catalog PR is
// only needed when the listing description itself changes.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const version = process.argv[2];
const notes = process.argv[3] ?? "";

function fail(msg) {
	console.error(`[release] FAIL: ${msg}`);
	process.exit(1);
}
function run(cmd, args, opts = {}) {
	const r = spawnSync(cmd, args, { stdio: "inherit", cwd: root, ...opts });
	if (r.status !== 0) fail(`${cmd} ${args.join(" ")} exited ${r.status}`);
}
function semver(v) {
	return /^v?\d+\.\d+\.\d+$/.test(v ?? "");
}
if (!semver(version)) fail(`version must be like 0.3.1, got "${version}"`);
const tag = `v${version.replace(/^v/, "")}`;

// --- 1. clean tree -----------------------------------------------------------
const dirty = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).stdout.trim();
if (dirty) fail(`working tree is not clean — commit or stash first:\n${dirty}`);

// --- 2. gate: bundle sync + unit tests --------------------------------------
console.log("[release] gate: bundle sync check");
run("node", ["scripts/build-client.mjs", "--check"]);
console.log("[release] gate: unit tests");
run("npm", ["test"]);

// --- 3. bump + commit ---------------------------------------------------------
const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const prev = pkg.version;
if (prev === version) fail(`package.json is already at ${version}`);
pkg.version = version;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`[release] ${prev} -> ${version}`);
run("git", ["add", "package.json"]);
run("git", ["-c", "user.name=Yu-tao-Li", "-c", "user.email=liytao.nw@foxmail.com",
	"commit", "-m", `release: ${tag}`, "-m", notes || `version ${prev} -> ${version}`]);

// --- 4. push main --------------------------------------------------------------
run("git", ["push", "origin", "main"]);

// --- 5. GitHub release ----------------------------------------------------------
const token = process.env.DSH_GITHUB_TOKEN
	?? readFileSync("E:/PythonFiles/.secrets/github-token-computer-use-win.txt", "utf8").trim();
const res = await fetch("https://api.github.com/repos/Yu-tao-Li/dsh-read-image-view/releases", {
	method: "POST",
	headers: {
		authorization: `Bearer ${token}`,
		"user-agent": "dsh-read-image-view-release",
		accept: "application/vnd.github+json",
		"content-type": "application/json"
	},
	body: JSON.stringify({ tag_name: tag, name: tag, target_commitish: "main", body: notes })
});
if (!res.ok) fail(`GitHub release create failed: HTTP ${res.status} ${await res.text()}`);
const rel = await res.json();
console.log(`[release] GitHub release ${rel.tag_name} created`);

// --- 6. npm publish ---------------------------------------------------------
console.log("[release] npm publish");
run("npm", ["publish"]);
console.log(`[release] DONE: ${pkg.name}@${version} (npm latest, GitHub ${tag})`);
