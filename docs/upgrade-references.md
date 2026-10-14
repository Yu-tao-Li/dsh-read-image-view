# 0.4.0 设计参考与验证边界 / Design references

本轮优先核对官方源码、规范及开源项目文档。资料用于决定实现和测试，未直接引入新的生产依赖。DSH master 文档与已发布版本可能不同；运行兼容性以实际 DSH 0.2.0-rc.2 和 Desktop 0.11.1 测试为准。

| 来源 | 本轮使用方式 |
| --- | --- |
| [DSH 工具 UI 契约](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-tool/README.md) | 核对工具拥有自己的视图、phase 数据和授权图片加载器；master 的扩展不能直接当成已发布版本的契约。 |
| [DSH 内置图片行](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-tool/src/client/tool/toolviews/read-image-row.tsx) | 对照图片结果、通用文本回退和工具视图职责。 |
| [DSH 附件 UI](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-attachment/README.md) | 图片字节继续交由宿主授权服务处理，不另设任意文件读取或附件 URL。 |
| [DSH read_image](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/fs/tool-fs/README.md) | 区分源文件与归一化附件；1:1 对应实际返回位图的像素，不承诺恢复上游已经下采样的源图。 |
| [DSH 会话 UI](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-session/README.md) | 核对图片行的会话范围；保留同一次请求的分组边界和无投影时单行回退。 |
| [Desktop 0.11.1](https://github.com/dataelement/dsh-desktop/releases/tag/v0.11.1) | 固定虚拟机桌面版目标，记录实际窗口、worker 和发布版本。 |
| [W3C 模态对话框模式](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | 验证初始焦点、Tab 循环、Esc 和关闭后返回触发图片。 |
| [HTML dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) | 使用原生 showModal，让背景控件不能接收普通用户交互。 |
| [CSS object-fit](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) | 预览使用 contain；极长图与全景图完整显示，以截图底部色块验证。 |
| [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) | 在图片接近视口时才调用宿主加载器；保留无该 API 时立即加载的回退。 |
| [Pointer capture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) | 拖拽越出图片后继续追踪同一指针。 |
| [pointercancel](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event) | 取消、失去捕获及卸载后结束手势，避免残留窗口级事件监听器。 |
| [touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) | 在放大层的图片上接管平移／双指缩放，不改变正常对话滚动。 |
| [Blob URL 生命周期](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static) | 插件不撤销宿主拥有的 URL，不声称自己实现了独立全局缓存；取消只阻止过时响应进入组件。 |
| [PhotoSwipe 缩放设计](https://photoswipe.com/adjusting-zoom-level/) | 区分适配窗口、原始位图 1:1 和用户缩放；旋转或缩小视口时重算 fit 状态。 |
| [Yet Another React Lightbox Zoom](https://yet-another-react-lightbox.com/plugins/zoom) | 参考键盘、双指缩放与拖拽输入；实现保持零生产依赖。 |
| [Electron 调试开关](https://www.electronjs.org/docs/latest/api/command-line-switches) | 用局部调试连接检查虚拟机实际桌面进程，不在宿主开放服务。 |
| [Electron app 路径](https://www.electronjs.org/docs/latest/api/app) | 核对 appData/userData、桌面版自有 harness 和 Web profile 的实际位置。 |
| [GitHub release 链接](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases) | 安装条目绑定实际发布 tag 和对应文件名。 |
| [商城贡献规范](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md) | 更新原 PR 的作者条目；避免 latest 配合固定版本文件名造成下一次发布后 404。 |

测试包括纯逻辑、真实 Chromium 中的发布 bundle、真实 DSH 附件/会话及虚拟机桌面版。浏览器服务夹具和完整宿主验证是不同证据；结果记录中分别注明。没有模型调用，也不将这些测试称为任意宿主、任意图片均已无缺陷。

The references guide implementation and acceptance checks. Runtime compatibility is established on the recorded released host versions, not inferred from master documentation. Chromium fixtures exercise the shipped UI with controlled host services; real host and VM desktop validation remain distinct. The plugin adds no production dependency and does not bypass session attachment authorization.
