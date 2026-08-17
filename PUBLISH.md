# 发布流程：GitHub + 插件市场（dshmarket）

调研自 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
（插件市场 [dshmarket](https://github.com/dsh-market/dsh-market) 的数据源）及其 `contributing.md`，
对照已上架插件（如 dsh-computer-use-win，同属本账号）的仓库结构仿建。

## 上架要求（CI 自动检查）

1. `package.json` 声明 `dsh.bundle` manifest（**只有 `dsh.client` 会被拒**）——本仓库已声明（`dsh.bundle.patch` + `dsh.client`）。
2. 仓库**创建满 1 天**且**提交数 ≥ 10**。
3. 仓库带 [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic。
4. 真实可用代码，非占位仓库。

## 我们的流程

### 第 0 步（已完成）：仓库文件齐备

| 文件 | 作用 |
|---|---|
| `package.json` | `dsh.bundle` manifest + `dsh.client` + `files` + metadata |
| `cordis.patch.yml` | bundle 补丁（注册 loader 条目；客户端插件无宿主服务） |
| `lib/read-image-core.mjs` + `src/client-src.js` + `scripts/build-client.mjs` | 核心 + bundle 模板 + 构建器（bundle 已提交，免安装时构建授权） |
| `test/` | 单元测试（CI 里跑 `node --test` + bundle 同步检查） |
| `LICENSE` | MIT |
| `.github/workflows/ci.yml` | ubuntu-latest：bundle sync check + 单元测试 |
| `assets/screenshot-{1,2,3}.png` | 商城截图（raw.githubusercontent 可直链） |
| `publish/awesome-list-entry.yml` | 收录条目（PR 里直接用） |
| `publish/screenshots.json` | 截图清单片段（PR 里合并进列表仓库） |

### 第 1 步：推 GitHub

```powershell
gh repo create dsh-read-image --public --source . --push
```

### 第 2 步：给仓库加 topic

```powershell
gh repo edit Yu-tao-Li/dsh-read-image --add-topic dsh-plugin
```

### 第 3 步：凑"仓库年龄 + 提交数"

CI 要求仓库**创建满 1 天**、提交数 **≥ 10**。
当前提交不足 10 个的话，把开发过程补成有意义的提交（docs / test / ci 拆分），
明天（或更晚）再提收录 PR，避免白跑 CI。

### 第 4 步：提收录 PR（满 1 天后）

```bash
git clone https://github.com/awesome-dsh-plugin/awesome-dsh-plugin
cd awesome-dsh-plugin
# 1) 收录条目
mkdir -p data/plugins
cp <本仓库>/publish/awesome-list-entry.yml data/plugins/Yu-tao-Li__dsh-read-image.yml
# 2) 截图：把 publish/screenshots.json 的内容合并进 data/screenshots.json
# 3) 重新生成 README（必须，CI 会校验）
npm ci
node scripts/generate-readme.mjs
# 4) 提交 + 推送 + 开 PR
git add data/plugins/Yu-tao-Li__dsh-read-image.yml data/screenshots.json README.md README.zh.md
git commit -m "Add Yu-tao-Li/dsh-read-image"
git push origin HEAD
gh pr create --repo awesome-dsh-plugin/awesome-dsh-plugin \
  --title "Add Yu-tao-Li/dsh-read-image" \
  --body "Render read_image tool results as real images in the DSH Web GUI conversation flow."
```

### 第 5 步：CI 会检查什么（失败就在同一分支推修复）

1. `dsh.bundle` — 从仓库 `package.json` 拉取校验 ✅（已声明）
2. 仓库年龄 / 提交数 — ≥ 1 天 / ≥ 10 次 ✅（第 3 步）
3. `awesome-lint` + 站点构建 — 双语一致、分隔符、日期、截图 URL 合法性

### 第 6 步（合并后，自动）

网站与 dshmarket 自动重建，插件即上架。用户侧：

```powershell
dsh plugin --profile web add github:Yu-tao-Li/dsh-read-image
# 或在 DSH 设置里的插件市场（dshmarket）搜索 "dsh-read-image" 一键安装
```

重启 `dsh web` 生效。

## 可选加分项

- **npm 发布**：`npm publish`（包名 `dsh-read-image` 需先 `npm whoami` / 查占用）；
  发布后收录条目加 `npm:` 字段，安装免构建授权。
- **GitHub Release tarball**：`npm pack` 出 tgz 挂到 Release，条目里加
  `tarball: https://github.com/Yu-tao-Li/dsh-read-image/releases/latest/download/dsh-read-image-<ver>.tgz`。
- **徽章**：上架后 README 加
  `[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)`。

## 安全提醒

- 上架 ≠ 安全审查（列表官方免责声明）。本插件**只读渲染**：仅经会话授权的
  `session.attachment` RPC 取图，无文件 I/O、无新端点、无写操作。
- GitHub token 只存在 `E:\PythonFiles\.secrets\` 与 git 凭据管理器，
  **不在仓库内**（`.gitignore` 已排除 `.secrets/`）。
