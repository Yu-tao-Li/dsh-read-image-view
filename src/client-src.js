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

		/*__READ_IMAGE_CORE__*/

		//#region styles
		/**
		 * Row chrome: the same layout and design tokens as the built-in
		 * ToolRow (height, typography, ioCard, inspect button, running sweep),
		 * namespaced under `dri-` so the global stylesheet never collides.
		 * Plus the expanded frame and the zoom lightbox.
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
			lbBackdrop: "dri-lbBackdrop",
			lbStage: "dri-lbStage",
			lbImg: "dri-lbImg",
			lbBar: "dri-lbBar",
			lbBtn: "dri-lbBtn",
			lbPct: "dri-lbPct"
		};
		//#endregion

		//#region attachment URL cache (browser only)
		/**
		 * Object URLs are cached per (session, attachment) for the page
		 * lifetime: the attachment store is content-addressed, so one id
		 * backs every result that names it, and every render site (the
		 * expanded frame and the lightbox) re-invokes the loader.
		 * Failures are not cached. The loader identity is stable per session
		 * so effects do not churn on parent re-renders.
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
		 * image at single-fit size (click → zoom lightbox) above the metadata
		 * envelope in the Output section. The lightbox zooms via control
		 * buttons and the mouse wheel, with drag-to-pan when zoomed.
		 * A failed call has no image part: the row surfaces the model-facing
		 * error text through its Output section and its first line in the
		 * collapsed summary.
		 * @param props - Tool-owned slot owner share plus the session-scoped
		 *   standard kit (sessionId, t).
		 */
		function ImageRow({ toolName, block, cwd, inspect, t, sessionId }) {
			// A settled image result opens expanded by default so the picture shows
			// at message-image size without a click — no tiny collapsed thumbnail.
			const imageBody = imageCardModel(block);
			const [expanded, setExpanded] = (0, react.useState)(imageBody !== null);
			const [lightboxUrl, setLightboxUrl] = (0, react.useState)(void 0);
			const done = "kind" in block;
			const argsRaw = (done ? block.call?.argsRaw : block.argsRaw) ?? "";
			const state = !done ? "running" : block.error?.code === "interrupted" ? "stopped" : block.isError ? "error" : "ok";
			const parsed = parseArgs(argsRaw);
			const isObj = typeof parsed === "object" && parsed !== null;
			const path = isObj ? pickString(parsed, FILE_PATH_KEYS) : void 0;
			const rawSummary = path ?? (isObj ? Object.values(parsed).find((v) => typeof v === "string" && v !== "") : argsRaw) ?? argsRaw;
			const summary = firstLine(relativizeToCwd(String(rawSummary), cwd));
			const output = done ? settledOutputText(block) : null;
			const errorSummary = state === "error" && output !== null ? firstLine(output) : null;
			const load = sessionId !== void 0 ? attachmentLoader(sessionId) : null;
			const labels = imageGalleryLabels(t);
			const expandable = output !== null || imageBody !== null;
			const open = expanded && expandable;
			const status = !done ? t("row.running") : state === "error" ? t("row.failed") : state === "stopped" ? t("row.stopped") : null;
			const failureLine = state === "error" ? errorSummary ?? null : null;
			const summaryText = failureLine ?? summary;
			const toggleExpand = () => {
				setExpanded((v) => !v);
			};
			const openLightbox = () => {
				if (imageBody === null || load === null) return;
				load(imageBody.attachment).then(setLightboxUrl).catch(() => {});
			};
			/** Leading-slot state substitution: the browse icon yields to the
			 *  terminal state semantic (error = red, interrupted = amber). */
			const icon = state === "error" ? (0, react_jsx_runtime.jsx)(primitives.StateDot, { state: "error" })
				: state === "stopped" ? (0, react_jsx_runtime.jsx)(primitives.StateDot, { state: "warning" })
				: (0, react_jsx_runtime.jsx)(primitives.IconBrowseOutline16, { size: 14 });
			return (0, react_jsx_runtime.jsxs)("div", {
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
							// Plain text path (NOT an openFile link): the host
							// openFile action launches the OS image viewer,
							// which covers the GUI — in-page viewing belongs to
							// the frame lightbox.
							(0, react_jsx_runtime.jsx)("span", {
								className: failureLine !== null ? `${css.summary} ${css.errorSummary}` : css.summary,
								children: summaryText
							})
						],
						children: (0, react_jsx_runtime.jsxs)("div", {
							className: css.bodyWrap,
							children: [
								imageBody !== null && load !== null && (0, react_jsx_runtime.jsx)(ImageFrame, {
									attachment: imageBody.attachment,
									load,
									labels,
									onOpen: openLightbox
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
					}),
					lightboxUrl !== void 0 && (0, react_jsx_runtime.jsx)(ZoomLightbox, {
						src: lightboxUrl,
						alt: imageBody?.attachment?.name ?? labels.image,
						labels,
						width: imageBody?.attachment?.width,
						height: imageBody?.attachment?.height,
						onClose: () => setLightboxUrl(void 0)
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
