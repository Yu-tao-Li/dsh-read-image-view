import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import {createRoot} from 'react-dom/client';
import * as ReactDOM from 'react-dom';
const h=React.createElement;
// Only host services/chrome are fixtures; ImageRow and the lightbox come from
// the actual shipped client bundle, running in a real Chromium renderer.
const primitives={
 DisclosureRow:props=>h('section',null,h('button',{className:'fixture-disclosure',onClick:props.onToggle,'aria-expanded':props.open},props.title,props.collapsedContent),props.open&&props.children),
 StateDot:()=>h('span'),IconBrowseOutlineRegular:()=>h('span'),IconInspectOutlineRegular:()=>h('span')
};
window.__ModuleLoader__={load:entry=>{
 const client=entry.factory(name=>name==='react'?React:name==='react/jsx-runtime'?jsxRuntime:name==='react-dom'?ReactDOM:name==='@deepseek-ai/dsh-client-ui-primitives'?primitives:(()=>{throw Error('Unknown fixture module '+name)})());
 const context = {
  inject: (_services, apply) => apply(context),
  uiConversation: { binding() { return { target: () => window.fixtureChat }; }, imageUrl(sessionId, attachment) {
   window.mcpSessions.push(sessionId);
   return window.fixtureLoad(attachment);
  } },
  slots: {
   inject: (_name, apply) => apply(),
   register: (entry, component) => {
    if (entry.key === 'read_image') window.ImageRow = component;
    else if (entry.name === 'conversation.hero.frame') {
     window.ConversationImageLayer = component;
     window.mcpInjectedProps = entry.inject();
    }
    return () => {};
   }
  }
 };
 client.apply(context);
}};
window.loads=[];window.deferred=[];window.failIds=new Set();window.delayIds=new Set();
const root=createRoot(document.getElementById('app'));
const texts={'image.label':'图片','image.openOriginal':'打开原图','image.openOriginalLabel':'打开原图','image.loading':'加载中','image.loadFailed':'加载失败，重试','image.preview':'图片预览','image.closePreview':'关闭预览','row.running':'运行中','row.failed':'失败','row.stopped':'已停止'};
const t=(key,params)=>texts[key]??key;
function pixels(ref){
 const canvas=document.createElement('canvas');canvas.width=ref.width;canvas.height=ref.height;
 const c=canvas.getContext('2d');c.fillStyle='#e53241';c.fillRect(0,0,ref.width,ref.height/2);c.fillStyle='#2032ef';c.fillRect(0,ref.height/2,ref.width,ref.height/2);
 return canvas.toDataURL('image/png');
}
const urls=new Map();
window.fixtureLoad=async ref=>{
 window.loads.push(ref.attachmentId);
 if(window.failIds.has(ref.attachmentId))throw Error('fixture denied');
 if(window.delayIds.has(ref.attachmentId))await new Promise(resolve=>window.deferred.push(resolve));
 if(!urls.has(ref.attachmentId))urls.set(ref.attachmentId,pixels(ref));
 return urls.get(ref.attachmentId);
};
window.makeReference=(id,width=120,height=2400)=>({attachmentId:'sha256:'+id,mediaType:'image/png',width,height,bytes:123,name:id+'.png'});
window.mountFixture=(references,options={})=>{
 window.references=references;
 const block={kind:'tool-result',callId:'fixture-read',call:{name:'read_image',argsRaw:'{"file_path":"fixture.png"}'},content:references.map(attachment=>({type:'image',attachment})),isError:false};
 const props={phase:'result',toolName:'read_image',block,callId:'fixture-read',cwd:'/fixture',inspect:()=>{},t,loadImage:window.fixtureLoad};
 if(options.useChat)props.useChat=()=>options.useChat;
 // Scene changes must commit before Playwright queries the next scene. React
 // otherwise schedules render after evaluate returns and a strict locator can
 // still see the preceding gallery. Image loading remains asynchronous.
 ReactDOM.flushSync(()=>root.render(h(window.ImageRow,{key:options.key??'row',...props})));
};
window.unmountFixture=()=>ReactDOM.flushSync(()=>root.render(null));
window.resolveLoads=()=>{window.delayIds.clear();for(const resolve of window.deferred.splice(0))resolve();};
window.mountReadPair = () => {
 const read = (callId, path) => h(window.ImageRow, {
  key: callId, phase: 'result', toolName: 'read_image', t, loadImage: window.fixtureLoad,
  block: {
   kind: 'tool-result', callId, call: { name: 'read_image', argsRaw: JSON.stringify({ file_path: path }) },
   content: [{ type: 'image', attachment: window.makeReference(callId, 400, 300) }]
  }
 });
 ReactDOM.flushSync(() => root.render([read('read-first', 'first.png'), read('read-second', 'second.png')]));
};
window.mountMcpFixture = (references, hideSecond = false) => {
 window.mcpSessions = [];
 const makeSource = (callId, refs) => {
  const node = { data: { root: {
   kind: 'tool-result', callId, name: 'mcp__test__capture',
   content: refs.map(attachment => ({ type: 'image', attachment }))
  } } };
  return { subscribe: () => () => {}, getSnapshot: () => node };
 };
 const sources = { first: makeSource('first', references.slice(0, 2)), second: makeSource('second', references.slice(2)) };
 const snapshot = { nodes: { source: (key) => sources[key] } };
 window.fixtureChat = { subscribe: () => () => {}, getSnapshot: () => snapshot };
 const call = (key) => h('div', {
  key, 'data-chat-flow-kind': 'tool-call', 'data-chat-node-key': key
 }, h('div', { 'data-chat-call-id': key }, 'Tool result ' + key));
 ReactDOM.flushSync(() => root.render(h('div', {
  'data-conversation-content': '', 'data-conversation-session': 'mcp-session'
 }, h(window.ConversationImageLayer, { key: references.length, ...window.mcpInjectedProps, t },
  call('first'), !hideSecond && call('second'), h('div', { 'data-turn-tail': '4' }, 'Delivered files')
 ))));
};
