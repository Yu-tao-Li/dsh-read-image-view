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

## 2. 取图端点：session.attachment RPC

运行时 `Session.readAttachment(attachmentId)` 内部调用：

```
POST /api/session.attachment
{ "type":"client-request", "rpcId":"<uuid>", "method":"session.attachment",
  "payload": { "sessionId": "…", "attachmentId": "sha256:…" } }

→ { "type":"server-response", "rpcId":"…",
    "result": { "ok": true,
                "value": { "attachment": {…}, "data": "<base64>" } } }
```

- 网关侧（`dsh-host-apiproxy`）的 `session.attachment` 实现：先按会话取投影状态，`referencedImage(state.events, attachmentId)` 校验该引用**确实出现在本会话日志里**才读附件——这就是"会话授权"，跨会话引用会被拒（`attachment-error`）。
- 浏览器同源调用即可（GUI 与网关同端口 3080）。已在 Node 侧实测：返回的 base64 解码后字节数与引用一致，PNG magic 正确。

## 3. 为什么不复用会话 store 的 loadImage（threading 方案被否）

会话 store 有 `resolveImage(sessionId, attachment)`（带 URL 缓存 + 代际失效），但它是 **conversation 模块内部**的：

- `loadImage` 只在 `conversation.chat.node` 的 owner 里出现，而 `ToolCallTree → ToolCall → tool.call.toolview owner` 这条链**不透传**它；
- 详情面板 `conversation.details.tool` 的 owner 更精简（只有 `block`/`cwd`）。

透传需要改 conversation / ui-tool 两个官方模块的组件签名——等于把特性焊死在 DSH 内部结构上。插件路线改为**自持 fetch**：同端点、同协议，Blob URL 按 (session, attachment) 页面级缓存（附件内容寻址 ⇒ 重复引用只取一次；失败不缓存）。代价是与会话 store 的 URL 缓存不共享（同一张图若同时出现在消息附件和工具结果里会各取一次）——可接受，且插件与 DSH 内部解耦。

## 4. 槽位契约（tool.call.toolview）

- `ToolCallTree`（ui-tool）注册 `conversation.chat.node` 键位 `tool-call`，其 children 声明 `tool.call.toolview`（`kind: "keyed", scope: "session"`）。
- 每个工具调用经 `renderSlot("tool.call.toolview", owner, {entryKey: toolName, fallback: GenericToolCard})` 分发：keyed 命中 → 渲染注册组件；未命中 → 通用卡片。
- 注册方式（与内置行完全一致）：
  `ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({name, key, locale:"conversation", priority}, ImageRow))`
- keyed 槽位同 key 同 priority 重复注册会**抛错**；不同 priority 是**影子机制**（"lowest renders"）。本插件用 `priority: 100`：未来若 DSH 内置 read_image 行（priority 0），内置自动胜出。
- 组件收到的 props = 标准 kit（session 槽：`sessionId`、`useSessions`、`useSession`…；`t` 来自 `locale: "conversation"`）+ owner（`callId`、`toolName`、`block`、`openFile`、`cwd`、`inspect`）。**fallback 分支（GenericToolCard）拿不到 kit**——所以自建行必须从 kit 取 sessionId。

## 5. 客户端模块装载链（本插件能"热生效"的原因）

- 每个声明 `dsh.client`（platform: web）且有 `exports["./client"]` 的包 = 客户端模块。宿主侧 `dsh-client-modules` 扫描 loader 条目，组合 `window.__DSH_BOOT__` 启动图，`/plugins/<id>/client.js?rev=<sha1-12>` 按**请求时读盘**下发（no-cache）。
- `dsh-client-hmr`（web 补丁里默认挂载）每 **500ms stat 轮询**所有图条目 bundle；文件变化 → 重算 rev → `/plugins/events` SSE 推 `rebuilt` 帧 → 浏览器侧 invalidate + 预取 + 换 fiber。**bundle 内容改动无需刷新页面、无需重启**（已实测：rev 翻转后 GUI 即时换渲染）。
- 注意：**新增模块**（新插件）要等下一次 `dsh web` 启动才进 loader 图——插件集装配在 boot 时。
- bundle 里的 `<style data-plugin="<id>">` 标签会被装载器登记（`styles: O6(id)`），HMR 换 fiber 时自动清掉——所以 CSS 注入必须带 `data-plugin` 属性（本插件照官方惯例写）。

## 6. 行外观：与内置 ToolRow 的像素级对齐

内置 ToolRow 的 CSS 是 CSS-module 哈希类名（`o3BgMG_*`），不可复用；本插件照抄其**布局与 design token**（行高 24px、14px 字号、ioCard 圆角 12px/边框 token、inspect 按钮 hover 显现、running sweep 动画），类名换 `dri-` 前缀避免全局碰撞。行结构（DisclosureRow + 折叠摘要 + 展开体）与内置行一致，视觉无差异。

## 7. 测试

- `test/read-image-core.test.mjs`（13 例，`node --test`）：imageCardModel 全部形状校验、RPC 信封（路径/方法/rpcId/payload/base64 解码）、HTTP 与业务错误、标签键。
- 浏览器侧（行渲染、lightbox）无单测——靠 CI bundle-sync + 真机 GUI 验证（README 截图即验证产物）。

## 8. 调试记录（2026-08-18）

- 会话日志 zstd 压缩（`session.jsonl.zstd`），`D:\anaconda3\Library\bin\zstd.exe -d` 可解；`read_image` 的 tool/call + tool/result 在 s17 等会话里可复核。
- 点击行摘要会触发 `openFile`（路径是 file link）——验证"展开"要点**标题区**而非路径。
- 行展开后图片 240px 长边（`MessageImage` single 变体，宽高比钳制 [0.25,4]，`object-fit: cover` 裁切）——宽幅截图会按 240 高/宽显示，属官方行为。
