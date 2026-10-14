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
.dri-frame img{display:block;width:100%;height:100%;min-width:0;min-height:0;object-fit:contain}
.dri-frame{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr)}
.dri-frameText{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13)}
.dri-grid{align-items:flex-start;flex-wrap:wrap;gap:8px;margin:4px 0 4px 4px;display:flex}
.dri-grid .dri-frame{margin:0}
.dri-gridTile{cursor:default;border:1px dashed var(--dsw-alias-border-l2);border-radius:16px;align-self:flex-start;align-items:center;flex:none;gap:8px;min-width:120px;max-width:240px;margin:0;padding:10px 14px;display:flex}
.dri-gridTileText{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font:var(--dsw-font-xs-13);overflow:hidden}
.dri-gridTile[data-state=error]{border-color:var(--dsw-alias-state-error-primary)}
.dri-gridTile[data-state=error] .dri-gridTileText{color:var(--dsw-alias-state-error-primary)}
.dri-lbBackdrop{border:0;margin:0;padding:0;width:100vw;height:100dvh;max-width:none;max-height:none;position:fixed;inset:0;z-index:2147483000;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.45));-webkit-backdrop-filter:var(--dsw-mask-blur,blur(2px));backdrop-filter:var(--dsw-mask-blur,blur(2px));display:flex;align-items:center;justify-content:center;overflow:hidden}
.dri-lbBackdrop:not([open]){display:none}
.dri-lbBackdrop::backdrop{background:transparent}
.dri-lbMessage{padding:20px;color:var(--dsw-alias-label-primary,#222);background:var(--dsw-alias-bg-base,#fff);border-radius:12px}
.dri-lbCaption{position:fixed;bottom:16px;left:16px;right:16px;text-align:center;color:var(--dsw-alias-label-primary,#fff);font-size:13px;pointer-events:none}
.dri-lbCounter{padding:0 8px;color:var(--dsw-alias-label-secondary,#222);white-space:nowrap}
.dri-lbBtn:disabled{opacity:.35;cursor:default}
.dri-lbBtn:focus-visible,.dri-frame:focus-visible{outline:2px solid #4589ff;outline-offset:2px}
@media(max-width:600px){.dri-lbBar{left:8px;right:8px;top:8px;flex-wrap:wrap;justify-content:center;border-radius:14px}.dri-lbBtn{min-height:40px;min-width:36px}.dri-lbCaption{bottom:12px}}
.dri-lbStage{display:flex;align-items:center;justify-content:center;width:100%;height:100%}
.dri-lbImg{flex-shrink:0;max-width:none;max-height:none;cursor:grab;user-select:none;-webkit-user-drag:none;/* PS-style gray/white transparency checkerboard: visible only through the image's transparent pixels. */background-color:#ffffff;background-image:repeating-conic-gradient(#d9d9d9 0% 25%,#ffffff 0% 50%);background-size:16px 16px}
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
			lbPct: "dri-lbPct", lbCounter:"dri-lbCounter", lbCaption:"dri-lbCaption", lbMessage:"dri-lbMessage"
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
		 * Gallery of session-authorized bitmaps. 100% maps one bitmap pixel to
		 * one CSS pixel; the host may normalize the source before returning it.
		 * Zoom beyond 100% interpolates the returned bitmap. Native dialog plus
		 * explicit boundary cycling contains focus and restores the opener.
		 * @param props - { gallery, initialIndex, load, labels, onClose }
		 */
		function ZoomLightbox({ gallery, initialIndex, load, labels, onClose }) {
		 const [index, setIndex] = react.useState(initialIndex);
		 const attachment = gallery[index];
		 const {url, failed, retry, markFailed} = useAttachmentUrl(attachment, load);
		 const [viewport, setViewport] = react.useState({w:window.innerWidth,h:window.innerHeight});
		 const [natural, setNatural] = react.useState({w:attachment.width,h:attachment.height});
		 const [view, setView] = react.useState({pct:fitZoomPct(window.innerWidth,window.innerHeight,attachment.width,attachment.height),pan:{x:0,y:0},fit:true});
		 const dialogRef = react.useRef(null);
		 const viewRef = react.useRef(view);viewRef.current=view;
		 const pointers = react.useRef(new Map());
		 const gesture = react.useRef(null);
		 const h = react.createElement;
		 const zh = String(labels.image).includes('图');
		 const sourceSize=attachment.originalDimensions;
		 const names = zh?{prev:'上一张',next:'下一张',out:'缩小',in:'放大',fit:'适应窗口',original:'原始尺寸（100%）',retry:'重试'}:{prev:'Previous image',next:'Next image',out:'Zoom out',in:'Zoom in',fit:'Fit to window',original:'Original size (100%)',retry:'Retry'};
		 const fit = () => setView({pct:fitZoomPct(viewport.w,viewport.h,natural.w,natural.h),pan:{x:0,y:0},fit:true});
		 const zoom = (pct,x=0,y=0) => setView(previous => {
		  const next = clampZoomPct(pct);
		  const pan = anchoredZoom(previous.pan,previous.pct,next,x,y);
		  return {pct:next,fit:false,pan:boundedPan(pan.x,pan.y,natural.w*next/100,natural.h*next/100,viewport.w,viewport.h)};
		 });
		 const move = delta => { pointers.current.clear();gesture.current=null;setIndex(value=>Math.max(0,Math.min(gallery.length-1,value+delta))); };
		 react.useEffect(()=>{
		  const dialog=dialogRef.current,opener=document.activeElement,overflow=document.body.style.overflow;
		  document.body.style.overflow='hidden';dialog.showModal();
		  return ()=>{pointers.current.clear();gesture.current=null;dialog.close();document.body.style.overflow=overflow;if(opener?.isConnected)opener.focus();};
		 },[]);
		 react.useEffect(()=>{
		  const onResize=()=>setViewport({w:window.innerWidth,h:window.innerHeight});
		  window.addEventListener('resize',onResize);return ()=>window.removeEventListener('resize',onResize);
		 },[]);
		 react.useEffect(()=>{
		  setNatural({w:attachment.width,h:attachment.height});
		  setView({pct:fitZoomPct(viewport.w,viewport.h,attachment.width,attachment.height),pan:{x:0,y:0},fit:true});
		 },[attachment]);
		 react.useEffect(()=>{
		  setView(previous=>{
		   const pct=previous.fit?fitZoomPct(viewport.w,viewport.h,natural.w,natural.h):previous.pct;
		   return {...previous,pct,pan:boundedPan(previous.pan.x,previous.pan.y,natural.w*pct/100,natural.h*pct/100,viewport.w,viewport.h)};
		  });
		 },[viewport,natural]);
		 react.useEffect(()=>{
		  const element=dialogRef.current;
		  const onWheel=event=>{if(event.target.closest('button'))return;event.preventDefault();zoom(viewRef.current.pct*Math.exp(-event.deltaY*0.0022),event.clientX-window.innerWidth/2,event.clientY-window.innerHeight/2);};
		  element.addEventListener('wheel',onWheel,{passive:false});return ()=>element.removeEventListener('wheel',onWheel);
		 },[viewport,natural]);
		 const resetGesture=()=>{
		  const points=[...pointers.current.values()];
		  if(points.length>=2){const [a,b]=points;gesture.current={kind:'pinch',distance:Math.hypot(a.x-b.x,a.y-b.y),center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},view:viewRef.current};}
		  else if(points.length===1)gesture.current={kind:'pan',point:points[0],view:viewRef.current};
		  else gesture.current=null;
		 };
		 const onPointerDown=event=>{
		  if(event.pointerType==='mouse'&&event.button!==0)return;
		  event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);
		  pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});resetGesture();
		 };
		 const onPointerMove=event=>{
		  if(!pointers.current.has(event.pointerId)||!gesture.current)return;
		  pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
		  const active=gesture.current,points=[...pointers.current.values()];let pct=active.view.pct,pan;
		  if(active.kind==='pinch'&&points.length>=2){
		   const [a,b]=points,center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
		   pct=clampZoomPct(active.view.pct*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,active.distance));
		   pan=anchoredZoom(active.view.pan,active.view.pct,pct,active.center.x-viewport.w/2,active.center.y-viewport.h/2);
		   pan={x:pan.x+center.x-active.center.x,y:pan.y+center.y-active.center.y};
		  }else{const point=points[0];pan={x:active.view.pan.x+point.x-active.point.x,y:active.view.pan.y+point.y-active.point.y};}
		  setView({pct,fit:false,pan:boundedPan(pan.x,pan.y,natural.w*pct/100,natural.h*pct/100,viewport.w,viewport.h)});
		 };
		 const endPointer=event=>{
		  pointers.current.delete(event.pointerId);
		  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
		  resetGesture();
		 };
		 const button=(text,title,onClick,disabled=false)=>h('button',{type:'button',className:css.lbBtn,title,'aria-label':title,onClick,disabled},text);
		 const onKeyDown=event=>{
		  if(event.key==='Tab'){
		   const buttons=[...event.currentTarget.querySelectorAll('button:not([disabled])')].filter(button=>button.getClientRects().length>0);
		   const first=buttons[0],last=buttons.at(-1);
		   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
		   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
		   return;
		  }
		  if(event.ctrlKey||event.metaKey||event.altKey)return;
		  if(['ArrowLeft','ArrowRight','+','=','-','0','f','F'].includes(event.key)){event.preventDefault();event.stopPropagation();}
		  if(event.key==='ArrowLeft')move(-1);else if(event.key==='ArrowRight')move(1);
		  else if(event.key==='+'||event.key==='=')zoom(view.pct*1.25);else if(event.key==='-')zoom(view.pct/1.25);
		  else if(event.key==='0')setView({pct:100,pan:{x:0,y:0},fit:false});else if(event.key==='f'||event.key==='F')fit();
		 };
		 const onLoad=event=>{const image=event.currentTarget;if(image.naturalWidth>0)setNatural({w:image.naturalWidth,h:image.naturalHeight});};
		 return react_dom.createPortal(h('dialog',{ref:dialogRef,className:css.lbBackdrop,role:'dialog','aria-label':labels.lightbox.dialog,'aria-modal':true,onKeyDown,onCancel:event=>{event.preventDefault();onClose();},onClick:event=>{if(!event.target.closest('img,button'))onClose();}},
		  h('div',{className:css.lbStage},url?h('img',{src:url,alt:attachment.name??labels.image,className:css.lbImg,draggable:false,onLoad,onError:markFailed,
		   style:{width:natural.w*view.pct/100,height:natural.h*view.pct/100,transform:`translate(${view.pan.x}px, ${view.pan.y}px)`,touchAction:'none'},
		   onPointerDown,onPointerMove,onPointerUp:endPointer,onPointerCancel:endPointer,onLostPointerCapture:endPointer,
		   onDoubleClick:event=>zoom(view.pct<99?100:fitZoomPct(viewport.w,viewport.h,natural.w,natural.h),event.clientX-viewport.w/2,event.clientY-viewport.h/2)
		  }):h('div',{role:'status',className:css.lbMessage},failed?h('button',{type:'button',onClick:retry},labels.loadFailed):labels.loading)),
		  h('div',{className:css.lbBar},gallery.length>1&&button('‹',names.prev,()=>move(-1),index===0),
		   h('span',{className:css.lbCounter,'aria-live':'polite'},`${index+1} / ${gallery.length}`),gallery.length>1&&button('›',names.next,()=>move(1),index===gallery.length-1),
		   button('−',names.out,()=>zoom(view.pct/1.25)),h('span',{className:css.lbPct},`${view.pct<10?view.pct.toFixed(1):Math.round(view.pct)}%`),button('+',names.in,()=>zoom(view.pct*1.25)),
		   button('⤢',names.fit,fit),button('1:1',names.original,()=>setView({pct:100,pan:{x:0,y:0},fit:false})),button('✕',labels.lightbox.close,onClose)),
		  h('div',{className:css.lbCaption},attachment.name??labels.image,` · ${natural.w} × ${natural.h}`,sourceSize&&(sourceSize.width!==natural.w||sourceSize.height!==natural.h)?` · ${zh?'源图':'Source'} ${sourceSize.width} × ${sourceSize.height}`:'')
		 ),document.body);
		}

		//#endregion

		//#region ImageFrame
		/**
		 * Resolve through the host loader, which owns authorization, caching
		 * and URL lifetime. Ignore completions belonging to stale view state.
		 * @param attachment - validated attachment reference.
		 * @param load - the session's stable loader.
		 * @returns {url, failed, retry} for the render sites.
		 */
		function useAttachmentUrl(attachment, load, active=true) {
   const [state,setState]=react.useState({attachment:null,load:null,url:undefined,failed:false});
   const [attempt,setAttempt]=react.useState(0);
   react.useEffect(()=>{
    let live=true;
    setState({attachment,load,url:undefined,failed:false});
    if(active)load(attachment).then(url=>{if(live)setState({attachment,load,url,failed:false});}).catch(()=>{if(live)setState({attachment,load,url:undefined,failed:true});});
    return ()=>{live=false;};
   },[attachment,load,attempt,active]);
   const current=state.attachment===attachment&&state.load===load;
   return {url:current?state.url:undefined,failed:current&&state.failed,retry:()=>setAttempt(n=>n+1),markFailed:()=>setState({attachment,load,url:undefined,failed:true})};
  }
  function useNearViewport() {
   const ref=react.useRef(null);
   const [active,setActive]=react.useState(typeof IntersectionObserver==='undefined');
   react.useEffect(()=>{
    if(active||!ref.current)return;
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setActive(true);observer.disconnect();}},{rootMargin:'400px'});
    observer.observe(ref.current);return ()=>observer.disconnect();
   },[active]);
   return {ref,active};
  }
  function ImageFrame({attachment,load,labels,onOpen}) {
   const {ref,active}=useNearViewport();
   const {url,failed,retry,markFailed}=useAttachmentUrl(attachment,load,active);
   const fit=singleFitSize(attachment.width,attachment.height);
   return react.createElement('button',{ref,type:'button',className:css.frame,title:failed?labels.loadFailed:labels.open,'aria-label':failed?labels.loadFailed:labels.openNamed(attachment.name??labels.image),style:{width:fit.width,height:fit.height},onClick:event=>{event.stopPropagation();if(failed)retry();else onOpen();}},
    url?react.createElement('img',{src:url,alt:attachment.name??labels.image,draggable:false,onError:markFailed,style:{objectFit:'contain',objectPosition:'center'},decoding:'async'}):react.createElement('span',{className:css.frameText,role:'status'},failed?labels.loadFailed:labels.loading));
  }
		/**
		 * The expanded-row frame: the image at its single-fit size (240px
		 * long edge, ratio-clamped, never upscaled). Clicking opens the zoom
		 * lightbox. While the URL loads it shows the locale loading hint; a
		 * failed load shows the retry control.
		 */

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
   const imageParts = phase === "result" ? imageAttachments(block) ?? [] : [];
			const [expanded, setExpanded] = (0, react.useState)(true);
			// Snapshot the gallery and selected index when opening a member.
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
					const attachments = settled ? imageAttachments(node) ?? [] : [];
     const attachment = attachments[0] ?? null;
					const text = settled ? settledOutputText(node) : null;
					const args = parseArgs(src.call?.argsRaw ?? src.argsRaw ?? "");
					const p = typeof args === "object" && args !== null ? pickString(args, FILE_PATH_KEYS) : void 0;
					return { callId: cid, state: mState, attachment, attachments, tileText: p !== void 0 ? relativizeToCwd(p, cwd) : firstLine(text ?? "") || null };
				});
			}, [snap, group, cwd]);
			if (group !== null && group.members.length > 1 && !group.lead) return null;
			const grouped = members !== null;
   const gallery = grouped ? members.flatMap(member=>member.attachments??[]) : imageParts;
			const rowState = grouped
				? members.some((m) => m.state === "running") ? "running"
					: members.some((m) => m.state === "error") ? "error"
					: members.some((m) => m.state === "stopped") ? "stopped" : "ok"
				: state;
			const groupErrorLine = grouped ? members.find((m) => (m.state === "error" || m.state === "stopped") && m.tileText !== null)?.tileText ?? null : null;
			const count=gallery.length || (grouped ? members.length : 0);
   const groupLabel = grouped || gallery.length>1 ? readImageGroupLabel(t, count) : null;
			const groupNoImages = grouped && members.every((m) => m.attachment === null);
			const failureLine = !grouped ? (state === "error" ? errorSummary ?? null : null) : null;
			const summaryText = grouped ? (groupNoImages && groupErrorLine !== null ? `${groupLabel} · ${groupErrorLine}` : groupLabel) : (groupLabel ?? failureLine ?? summary);
			const summaryErrorStyle = grouped ? groupNoImages && groupErrorLine !== null : failureLine !== null;
			const expandable = grouped ? members.some((m) => m.attachment !== null || m.state === "error" || m.state === "stopped") : output !== null || imageBody !== null;
			const open = expanded && expandable;
			const status = rowState === "running" ? t("row.running") : rowState === "error" ? t("row.failed") : rowState === "stopped" ? t("row.stopped") : null;
			const toggleExpand = () => {
				setExpanded((v) => !v);
			};
   const openLightboxFor = attachment => {
    if(attachment===null||load===null)return;
    const index=gallery.indexOf(attachment);
    if(index>=0)setLightbox({gallery:[...gallery],index});
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
           if(m.attachment!==null&&load!==null)return (m.attachments??[m.attachment]).map((attachment,index)=>react.createElement(ImageFrame,{attachment,load,labels,onOpen:()=>openLightboxFor(attachment),key:m.callId+':'+index}));
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
           load!==null&&imageParts.map((attachment,index)=>react.createElement(ImageFrame,{attachment,load,labels,onOpen:()=>openLightboxFor(attachment),key:index})),
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
     lightbox!==undefined&&react.createElement(ZoomLightbox,{gallery:lightbox.gallery,initialIndex:lightbox.index,load,labels,onClose:()=>setLightbox(undefined)})
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
