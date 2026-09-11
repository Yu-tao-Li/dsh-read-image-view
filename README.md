[English](README.en.md)

# dsh-read-image-view

[![CI](https://github.com/Yu-tao-Li/dsh-read-image-view/actions/workflows/ci.yml/badge.svg)](https://github.com/Yu-tao-Li/dsh-read-image-view/actions/workflows/ci.yml)
[![version](https://img.shields.io/github/v/release/Yu-tao-Li/dsh-read-image-view?label=version)](https://github.com/Yu-tao-Li/dsh-read-image-view/releases)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
![platform](https://img.shields.io/badge/platform-Web%20GUI-6E56CF)
[![stars](https://img.shields.io/github/stars/Yu-tao-Li/dsh-read-image-view?style=social)](https://github.com/Yu-tao-Li/dsh-read-image-view)

**让 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Web GUI 在对话里直接显示 `read_image` 读到的图片。** 模型调用 `read_image` 后，对话流中出现专用 **Read image** 行：**默认展开**为消息图片同款样式的圆角图片卡（240px 长边帧），**透明图片显示 PS 风格灰白棋盘格**；同一次请求里读到的多张图**合并成一行并排展示**（`读取了 N 张图片`）。点击任一图片在**页面内**弹出原图放大层（遮罩 + 毛玻璃），支持**缩放按钮、鼠标滚轮、1:1 原始尺寸**——100% 即原图像素 1:1，放大永远清晰（按真实像素渲染，不是缩放插值）。

纯客户端插件（browser-only），零运行时依赖，不改 DSH 本体。

| ① 多图合并行：同一次请求读到的图并排成网格（`Read image · 读取了 N 张图片`） | ② 透明图片：PS 风格灰白棋盘格，只在透明像素处可见 |
|---|---|
| ![1](assets/screenshot-1.png) | ![2](assets/screenshot-2.png) |
| ③ 页面内放大层：100% = 原始尺寸；控制条 − / % / + / 适应窗口 / 1:1 / 关闭 | ④ 折叠态：摘要显示组标签；点击任意图片可重新展开 |
| ![3](assets/screenshot-3.png) | ![4](assets/screenshot-4.png) |

## 背景

`read_image` 工具把读到的图片持久化进 DSH 的**内容寻址附件存储**（`$DSH_HOME/attachments/v1/objects/<sha256>`），`tool/result` 事件里只存一个 `sha256:` 引用 + 元数据（`mediaType`/`width`/`height`/`bytes`/`name`）。Web GUI 之前的工具行渲染把非文本内容块一律 JSON 化展示——用户看到的是一大段附件引用 JSON，而不是图片本身。

本插件补上这一环：从工具结果里提取附件引用，通过网关既有的 `session/attachment` RPC（与运行时 Session 门面同一端点，同源）取回**原始字节**（全程不重压缩），在页面内渲染图片卡、多图网格与可缩放放大层。

## 特性

- **专用 Read image 行**——与内置 Read 行同款外观（browse 图标、状态点、运行中扫描动画、展开/收起）。
- **默认展开的图片卡**——无需点击：结果落定即按**消息图片同款规则**渲染（240px 长边、比例钳制、绝不放大原图），16px 圆角 + 细边框 + 棋盘格底；没有小缩略图（旧版的 20px 折叠缩略图已移除——它既看不清图，透明图还会显示成死白/死黑一块）。
- **透明棋盘格**——PS 风格灰白棋盘（`repeating-conic-gradient`，16px 格）作为图片卡与放大层的底色，**只在图片透明像素处可见**：PNG 的透明区域一眼可辨，不透明图完全无感。
- **多图合并行（读取了 N 张图片）**——同一次用户请求里出现的所有 `read_image` 结果合并成**一行**：摘要 `Read image · 读取了 N 张图片`，展开区是**并排换行的图片网格**（每张一个消息图片帧），点击任一格打开**该图自己的**放大层。中间夹了别的工具调用、模型文字都不拆组——只有新的用户消息 / 插话（steering）/ 命令 / 回合边界才断开；进行中的成员显示虚线加载格，失败成员显示紧凑文本格。分组纯客户端计算（读会话快照 `useSession`），不重复渲染：组内其余成员渲染为空。
- **页面内放大层（lightbox）**——portal 到 body 的全屏层：设计系统遮罩 token（`--dsw-alias-bg-mask-1`）+ 毛玻璃（`--dsw-mask-blur`，深色主题下靠模糊成"模态"）；透明图在放大层同样显示棋盘格；Esc / 点空白 / ✕ 关闭；**可重复打开，不是一次性**（网格里的任一帧随时再点再开）。
- **全精度缩放**——100% = 原图 1:1 像素（不是"适配视口"）；img 按真实像素宽渲染，≥100% 时浏览器从原图位图重栅格化（放大不模糊），<100% 为高质量下采样；打开时自适应视口但不放大超过 100%。
- **三种缩放操控**——控制条 **− / +** 按钮（×/÷1.25）、**鼠标滚轮**（平滑指数、10%–800% 限位）、**⤢ 适应窗口** 与 **1:1** 按钮；放大超出视口后可**拖拽平移**。
- **元数据信封按需显示**——纯文本/错误结果仍在 OUT 区显示 `<path>/<type>/<content>`（媒体类型、像素尺寸、字节数）；带图结果的信封是冗余文本，自动隐藏，只留图片。
- **错误路径不变**——文件不存在 / 模型不支持图片等失败结果没有 image 内容块：单图行按普通错误展示（红点 + 错误文本），合并行里则是紧凑文本格；图片卡加载失败有重试按钮。
- **安全边界不放宽**——图片字节只经 `session/attachment` 端点获取，该端点按会话授权（引用必须出现在该会话的持久日志中才放行）；插件本身不做任何文件 I/O，不新增网络端点。
- **优雅让位**——注册 `tool.call.toolview` 键位 `read_image` 时使用 `priority: 100`：若未来 DSH 内置 read_image 渲染（priority 更低），内置行自动胜出，本插件保持注册但不渲染，零冲突。

## 安装

```powershell
# 从 GitHub（--profile 指定装进哪个 profile；Web GUI 用 web）
dsh plugin --profile web add github:Yu-tao-Li/dsh-read-image-view
# 本地目录
dsh plugin --profile web add file:\<path>\dsh-read-image-view
```

重启 `dsh web` 生效（profile 插件集在启动时装配）。此后模型每次 `read_image`，对话里即可直接看到图；一次读多张时自动并排成一行。

## 工作原理

```
DSH Web GUI（浏览器）
  │  tool.call.toolview 键位 "read_image" → 本插件 ImageRow
  │  │
  │  ├─ 分组：useSession 读会话快照（有序 nodes + runningCalls）
  │  │        → readImageGroup()：同一用户请求内的 read_image 归为一组
  │  │          （用户消息/steering/命令/回合边界断组，其余内容不拆）
  │  ├─ 组首行：Read image · 读取了 N 张图片（默认展开）
  │  │          └─ 网格：每个成员一个 ImageFrame（240px 长边帧，
  │  │             棋盘格底；点击 → 该图自己的页面内放大层）
  │  ├─ 单图行：Read image · <path 普通文本>（默认展开）+ 一个 ImageFrame
  │  └─ 无图成员/单图错误：紧凑文本格 / OUT 元数据信封
  │        │  load(attachment) → POST /api/session/attachment
  │        │  { type:"client-request", method:"session/attachment",
  │        │    payload:{ args:{ request:{ sessionId, attachmentId } } } }
  │        ▼
  │      网关 → 附件存储（sha256 内容寻址）→ { value:{ attachment, data(base64) } }
  │        │  base64 → Blob URL（原始字节，按 (session, attachment) 页面级缓存）
  │        ▼
  │      ImageFrame / ZoomLightbox（react-dom portal 到 body，
  │      真实像素宽渲染 + 遮罩/毛玻璃 token + 缩放控制条）
  ▼
shell 内置模块：react / react-dom / dsh-client-ui-primitives（仅借图标与状态点）
```

核心逻辑（`lib/read-image-core.mjs`）为纯函数：内容块校验、RPC 取字节（fetch 依赖注入，Node 可单测）、缓存键、缩放/适配钳制（`clampZoomPct`/`fitZoomPct`）、**多图分组判定（`readImageGroup`）与组标签（`readImageGroupLabel`）**、语言键解析。浏览器 bundle（`lib/client.js`）由 `scripts/build-client.mjs` 把核心内联进 `src/client-src.js` 生成，CI 校验 bundle 与源同步。

## 安全与限制

- **只读渲染**——插件只取图、只渲染，无任何写操作；不新增网络端点。
- **会话授权**——`session/attachment` 只放行该会话持久日志中引用过的附件；跨会话引用被拒（`attachment-error`）。
- **内存**——Blob URL 按 (session, 附件) 缓存于页面生命周期内（附件内容寻址，重复引用只取一次）；页面刷新即释放。大量超大图片场景下可自行刷新页面回收。
- **仅 Web GUI**——TUI / 其他表面不受影响（工具结果数据本身未变）。
- 依赖 shell 内置的 `react` / `react-dom` / `dsh-client-ui-primitives` 模块、`image.*` 语言键与 session 标准件（`useSession` 快照钩子）；若上游调整了槽位契约（`tool.call.toolview`）、模块装载表或会话快照结构，需同步适配。
- 全精度缩放的语义：100% 恒等于原图像素 1:1；>100% 是浏览器对原图位图的放大（插值），属正常现象。

## 开发

```
lib/read-image-core.mjs   核心纯逻辑（Node 可单测）
src/client-src.js         浏览器 bundle 模板（/*__READ_IMAGE_CORE__*/ 占位）
scripts/build-client.mjs  构建 / --check（CI 校验 bundle 与源同步）
lib/client.js             构建产物（提交入库，免安装时构建授权）
lib/index.js              无操作宿主半边（loader 入口）
cordis.patch.yml          profile 补丁层（注册 loader 条目）
test/read-image-core.test.mjs   单元测试（node --test）
test/e2e-read-image.mjs         真实浏览器 e2e（headless Edge，产出 e2e-shots/ 截图）
docs/dev-notes.md         设计决策、调试记录
```

```powershell
npm run build    # 重新生成 lib/client.js
npm run check    # 校验 bundle 与 src/+core 同步
npm test         # node --test（32 例）
npm run e2e      # 需要运行中的 dsh web + playwright-core（devDependency）+ 系统 Edge
```

CI（`.github/workflows/ci.yml`）在每次 push/PR 跑 bundle 同步检查 + 单元测试；e2e 需要运行中的 GUI，故不入 CI（本地回归用，本仓库 README 的截图即由它产出）。

## 许可

MIT，见 [LICENSE](LICENSE)。
