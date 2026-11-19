# 发布流程

1. 修改源码后运行 `npm run build`、`npm run check`、`npm test` 和 `npm run test:browser`。
2. UI 改动需在匹配版本的真实 DSH 宿主中验证。桌面版使用隔离的数据目录，记录宿主版本、profile、安装包和实际运行证据。
3. 审核提交与 `npm pack --dry-run` 的文件清单，排除凭据、本地记录、个人路径和目录索引。将候选包安装到测试宿主，核对运行文件与源码字节一致。
4. 提交分支并创建 PR，等待 CI 成功；合并后核对 main 和版本 tag 指向已测试代码，等待对应 CI。
5. 将审核过的 tgz 上传到 GitHub Release。发布 Release 后，在 GitHub Actions 手动运行 **Publish npm release**，选 `main` 并填写版本标签。工作流校验 Release 资产摘要及 npm 包名和版本，再通过 OIDC 发布同一个 tgz。发布后核对 registry 版本、全新安装及两边下载字节。
6. 更新商城作者条目、生成 README、通过校验后推送原商城 PR。使用固定 tag URL，例如：

```yaml
tarball: https://github.com/Yu-tao-Li/dsh-read-image-view/releases/download/v0.4.0/dsh-read-image-view-0.4.0.tgz
```

`latest/download` 必须搭配不随版本变化的资产名。版本化文件名应配固定 tag，否则下一次发布后会失效。见 [商城 contributing](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)。

首次发布前，在 npm 的 Trusted Publisher 页面添加 GitHub Actions，用户填 `Yu-tao-Li`，仓库填 `dsh-read-image-view`，工作流文件名填 `publish-npm.yml`，Environment name 留空，开启 **Allow npm publish**。

旧 `scripts/release.mjs` 会直接提交、推送和发布。上述流程保留 CI 和宿主验证，并使用 Trusted Publisher。
