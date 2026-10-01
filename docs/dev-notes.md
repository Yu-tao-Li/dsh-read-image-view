# dev-notes：设计决策与调试记录

（2026-08-18，v0.1.0；记录在真实环境里验证过的事实，避免重踩。）

## 1. 数据面：read_image 的结果里到底有什么

`tool/result` 事件（会话日志 `.jsonl` 里的原始形态）：

```json
{
  "type": "tool/result",
  "data": {
    "message": {
      "content": [{
        "type": "tool-result",
        "toolCallId": "chatcmpl-tool-…",
        "content": [
          { "type": "text", "text": "<path>…</path>\n<type>image</type>\n<content>\nimage/png image, 2135x717 px, 109360 bytes\n</content>" },
          { "type": "image", "attachment": {
              "attachmentId": "sha256:d9b3…", "mediaType": "image/png",
              "bytes": 109360, "width": 2135, "height": 717, "name": "fig1….png" } }
        ],
        "isError": false
      }],
      "role": "user"
    }
  }
}
```

- 图片字节**不在日志里**——只有 `sha256:` 附件引用。字节在 `$DSH_HOME/attachments/v1/objects/`（内容寻址）。
- 客户端把 `tool/result` 折成 `ToolResultNode`：`{kind:"tool-result", content: <上述 content 原样>, isError, call?, resultView?, …}`。运行中的调用是 `ToolCallBlock`（**没有 `kind` 字段**）——`"kind" in block` 是判断 settled 的惯用法。
- `read_image` 的结果**没有 render-intent card**（不像 read/diff/terminal 有 `resultView.card`），所以走通用行渲染——这正是本插件键位注册的切入点。

## 2. 取图：宿主提供的会话授权 loader

DSH 0.2 的 `tool.call.toolview` owner 直接提供 `loadImage(attachment)`。插件只把经过 `imageCardModel` 校验的附件引用交给它，得到宿主管理的 Blob URL；插件不自行拼接 RPC、读取文件或绕过会话授权。

- loader 的授权、缓存和 URL 生命周期属于宿主；插件只处理加载成功、失败和重试的呈现。
- `lib/read-image-core.mjs` 仍保留旧 carrier 的 RPC envelope 校验，作为兼容测试面；0.2 Web GUI 的真实路径使用 `loadImage`。

## 3. 为什么使用 `useChat` legacy 投影

`useSession` 在 0.2 只提供生命周期状态，不包含会话节点。`useChat` 是 `SessionStandardProps` 的聊天投影 hook，其中 `s.legacy` 保留了 `nodes` 和 `runningCalls`，正好用于把同一用户请求中的多个 `read_image` 结果合并。插件优先读取这个投影，并对旧版仍保留 `useSession` 形状的安全退化。

## 4. 槽位契约（tool.call.toolview）

- `ToolCallTree`（ui-tool）注册 `conversation.chat.node` 键位 `tool-call`，其 children 声明 `tool.call.toolview`（`kind: "keyed", scope: "session"`）。
- 每个工具调用经 `renderSlot("tool.call.toolview", owner, {entryKey: toolName, fallback: GenericToolCard})` 分发：keyed 命中 → 渲染注册组件；未命中 → 通用卡片。
- 注册方式（与内置行完全一致）：
  `ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({name, key, locale:"conversation", priority}, ImageRow))`
- keyed 槽位同 key 同 priority 重复注册会**抛错**；不同 priority 是**影子机制**（lowest renders）。本插件用 `priority: -1` 覆盖 DSH 0.2 内置的 `priority: 0` 行。
- 组件收到的 props = 标准 kit（session 槽：`useChat`、`useSession`、`sessionId`…；`t` 来自 `locale: "conversation"`）+ owner（`callId`、`toolName`、`block`、`loadImage`、`cwd`、`inspect`）。

## 5. 客户端模块装载链（本插件能"热生效"的原因）

- 每个声明 `dsh.client`（platform: web）且有 `exports["./client"]` 的包 = 客户端模块。宿主侧 `dsh-client-modules` 扫描 loader 条目，组合 `window.__DSH_BOOT__` 启动图，`/plugins/<id>/client.js?rev=<sha1-12>` 按**请求时读盘**下发（no-cache）。
- `dsh-client-hmr`（web 补丁里默认挂载）每 **500ms stat 轮询**所有图条目 bundle；文件变化 → 重算 rev → `/plugins/events` SSE 推 `rebuilt` 帧 → 浏览器侧 invalidate + 预取 + 换 fiber。**bundle 内容改动无需刷新页面、无需重启**（已实测：rev 翻转后 GUI 即时换渲染）。
- 注意：**新增模块**（新插件）要等下一次 `dsh web` 启动才进 loader 图——插件集装配在 boot 时。
- bundle 里的 `<style data-plugin="<id>">` 标签会被装载器登记（`styles: O6(id)`），HMR 换 fiber 时自动清掉——所以 CSS 注入必须带 `data-plugin` 属性（本插件照官方惯例写）。

## 6. 行外观：与内置 ToolRow 的像素级对齐

内置 ToolRow 的 CSS 是 CSS-module 哈希类名（`o3BgMG_*`），不可复用；本插件照抄其**布局与 design token**（行高 24px、14px 字号、ioCard 圆角 12px/边框 token、inspect 按钮 hover 显现、running sweep 动画），类名换 `dri-` 前缀避免全局碰撞。行结构（DisclosureRow + 折叠摘要 + 展开体）与内置行一致，视觉无差异。

## 7. 测试

- `npm test`：35 例通过，覆盖 imageCardModel、RPC 兼容 helper、缩放/适配、分组边界、DSH 0.2 manifest 和 bundle contract。
- `npm run check`：确认 `lib/client.js` 与源文件同步。
- `test/e2e-read-image.mjs`：在隔离 DSH 0.2 Web profile 中回放官方 Session/JSONL fixture，使用真实 `loadImage`，验证合并行、成功/失败成员、lightbox、滚轮缩放、Esc、折叠重开；Edge 桌面和 390x844 移动视口均通过且无浏览器错误。

## 8. 调试记录（2026-08-18）

- 会话日志 zstd 压缩（`session.jsonl.zstd`），`D:\anaconda3\Library\bin\zstd.exe -d` 可解；`read_image` 的 tool/call + tool/result 在 s17 等会话里可复核。
- 路径摘要可能包含宿主提供的 file link；验证"展开"时点击**标题区**，避免把路径点击误判为行交互。
- 行展开后图片 240px 长边（`MessageImage` single 变体，宽高比钳制 [0.25,4]，`object-fit: cover` 裁切）——宽幅截图会按 240 高/宽显示，属官方行为。
