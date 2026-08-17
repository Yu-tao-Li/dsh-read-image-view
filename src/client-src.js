window.__ModuleLoader__.load({
	id: "dsh-read-image",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let attachment = require("@deepseek-ai/dsh-client-ui-attachment");

		/*__READ_IMAGE_CORE__*/

		//#region styles
		/**
		 * Row chrome: the same layout and design tokens as the built-in
		 * ToolRow (height, typography, ioCard, inspect button, running sweep),
		 * namespaced under `dri-` so the global stylesheet never collides.
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
.dri-fileLink{text-overflow:ellipsis;white-space:nowrap;min-width:0;font:inherit;text-align:left;color:var(--dsw-alias-label-secondary);text-decoration:underline;text-decoration-color:var(--dsw-alias-label-quaternary);text-underline-offset:3px;cursor:pointer;background:0 0;border:none;flex:auto;margin:0;padding:0;font-size:14px;line-height:24px;overflow:hidden}
.dri-fileLink:hover{color:var(--dsw-alias-label-primary);text-decoration-color:currentColor}
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
.dri-visuallyHidden{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}`;
		const cssTagId = "dsh-read-image/read-image-row.css";
		if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css="${cssTagId}"]`) === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-read-image";
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
			fileLink: "dri-fileLink",
			errorSummary: "dri-errorSummary",
			bodyWrap: "dri-bodyWrap",
			ioCard: "dri-ioCard",
			ioSection: "dri-ioSection",
			ioLabel: "dri-ioLabel",
			ioText: "dri-ioText",
			inspectButton: "dri-inspectButton",
			visuallyHidden: "dri-visuallyHidden"
		};
		//#endregion

		//#region attachment URL cache (browser only)
		/**
		 * Object URLs are cached per (session, attachment) for the page
		 * lifetime: the attachment store is content-addressed, so one id
		 * backs every result that names it, and the gallery atoms re-invoke
		 * the loader on every mount and retry. Failures are not cached. The
		 * loader identity is stable per session so the atoms' load effect
		 * does not churn on parent re-renders.
		 */
		const urlCache = /* @__PURE__ */ new Map();
		const loaderCache = /* @__PURE__ */ new Map();
		function attachmentLoader(sessionId) {
			let loader = loaderCache.get(sessionId);
			if (loader === void 0) {
				loader = (attach) => {
					const key = attachmentCacheKey(sessionId, attach.attachmentId);
					let pending = urlCache.get(key);
					if (pending === void 0) {
						pending = fetchAttachmentBytes(sessionId, attach, globalThis.fetch)
							.then(({ bytes, mediaType }) => URL.createObjectURL(new Blob([bytes], { type: mediaType })));
						pending.catch(() => {
							if (urlCache.get(key) === pending) urlCache.delete(key);
						});
						urlCache.set(key, pending);
					}
					return pending;
				};
				loaderCache.set(sessionId, loader);
			}
			return loader;
		}
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
		 * skipped — they render as the real image above. Empty content on a
		 * failed call falls back to the structured error's `name: code` line.
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
		//#endregion

		//#region ImageRow
		/**
		 * read_image row: icon + Read image · {path} in the shared disclosure
		 * chrome, with the result's image as the row's collapsed-by-default
		 * card body. The image part is a durable attachment reference; the
		 * shared gallery atoms resolve it (loading, retry, original-image
		 * preview on click) while the text envelope (media type, dimensions,
		 * byte size) stays in the Output section. The summary path is an
		 * openable host link; a failed call has no image part, so the row
		 * surfaces the model-facing error text through its Output section and
		 * its first line in the collapsed summary.
		 * @param props - Tool-owned slot owner share plus the session-scoped
		 *   standard kit (sessionId, t).
		 */
		function ImageRow({ toolName, block, cwd, openFile, inspect, t, sessionId }) {
			const [expanded, setExpanded] = (0, react.useState)(false);
			const done = "kind" in block;
			const argsRaw = (done ? block.call?.argsRaw : block.argsRaw) ?? "";
			const state = !done ? "running" : block.error?.code === "interrupted" ? "stopped" : block.isError ? "error" : "ok";
			const parsed = parseArgs(argsRaw);
			const isObj = typeof parsed === "object" && parsed !== null;
			const path = isObj ? pickString(parsed, FILE_PATH_KEYS) : void 0;
			const rawSummary = path ?? (isObj ? Object.values(parsed).find((v) => typeof v === "string" && v !== "") : argsRaw) ?? argsRaw;
			const summary = firstLine(relativizeToCwd(String(rawSummary), cwd));
			const imageBody = imageCardModel(block);
			const output = done ? settledOutputText(block) : null;
			const errorSummary = state === "error" && output !== null ? firstLine(output) : null;
			const expandable = output !== null || imageBody !== null;
			const open = expanded && expandable;
			const status = !done ? t("row.running") : state === "error" ? t("row.failed") : state === "stopped" ? t("row.stopped") : null;
			const failureLine = state === "error" ? errorSummary ?? null : null;
			const summaryText = failureLine ?? summary;
			const fileLink = failureLine === null && path !== void 0 && openFile !== void 0;
			const toggleExpand = () => {
				setExpanded((v) => !v);
			};
			const openFileClick = (event) => {
				event.stopPropagation();
				if (path !== void 0) openFile?.(path);
			};
			const fileLinkKeyDown = (event) => {
				if (event.key === "Enter" || event.key === " ") event.stopPropagation();
			};
			/** Leading-slot state substitution: the browse icon yields to the
			 *  terminal state semantic (error = red, interrupted = amber). */
			const icon = state === "error" ? (0, react_jsx_runtime.jsx)(primitives.StateDot, { state: "error" })
				: state === "stopped" ? (0, react_jsx_runtime.jsx)(primitives.StateDot, { state: "warning" })
				: (0, react_jsx_runtime.jsx)(primitives.IconBrowseOutline16, { size: 14 });
			return (0, react_jsx_runtime.jsx)("div", {
				className: css.root,
				"data-tool": toolName,
				"data-state": state,
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
							fileLink ? (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: css.fileLink,
								onClick: openFileClick,
								onKeyDown: fileLinkKeyDown,
								children: summaryText
							}) : (0, react_jsx_runtime.jsx)("span", {
								className: failureLine !== null ? `${css.summary} ${css.errorSummary}` : css.summary,
								children: summaryText
							})
						],
						children: (0, react_jsx_runtime.jsxs)("div", {
							className: css.bodyWrap,
							children: [
								imageBody !== null && sessionId !== void 0 && (0, react_jsx_runtime.jsx)(attachment.ImageGallery, {
									images: [{ attachment: imageBody.attachment }],
									load: attachmentLoader(sessionId),
									align: "start",
									labels: imageGalleryLabels(t)
								}),
								output !== null && (0, react_jsx_runtime.jsxs)("div", {
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
								}),
								inspect !== void 0 && (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: css.inspectButton,
									onClick: inspect,
									children: [(0, react_jsx_runtime.jsx)(primitives.IconInspectOutline12, {}), "Inspect"]
								})]
						})
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
		 * built-in rows use, across independent activation and reload
		 * lifetimes. `priority: 100` makes this row a shadow: if a future
		 * first-party renderer takes the same key at a lower priority, it
		 * wins and this plugin stays registered but unrendered.
		 * @param ctx - Client root context.
		 */
		function apply(ctx) {
			ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: "read_image",
				locale: "conversation",
				priority: 100
			}, ImageRow));
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
