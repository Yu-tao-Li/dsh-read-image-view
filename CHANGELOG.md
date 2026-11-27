# Changelog

## 0.5.2

- Support replacement `read_image` tools with custom arguments, including `dsh-read-image-plus` with `sources`. All validated images from a call appear in one gallery in result order.
- Keep keyboard focus in the gallery when navigation reaches the first or last image so zoom and arrow keys continue to work.

## 0.5.1

- Keep each `read_image` preview with the tool invocation and input path.
- Place MCP attachment previews under their own tool results and keep the reply footer available for deliveries.

## 0.5.0

- Preview MCP images admitted as session attachments in a per-turn gallery on DSH 0.2.2 Web.
- Document native Markdown image previews and the host requirement for MCP audio playback.

## 0.4.0

- Show every validated image in a result, with uncropped previews and gallery navigation.
- Add keyboard navigation, native modal focus handling, bounded panning and two-finger zoom.
- Defer host loading until near the viewport; retry failures and ignore stale async completions.
- Show returned bitmap dimensions and source dimensions when available.
- Add Chromium rendering/interaction regressions to CI and verify DSH Desktop 0.11.1 / Harness 0.2.0-rc.2 in a Windows 11 VM.
- Keep existing tool contracts, session authorization and zero production dependencies.

中文：完整预览、多图画廊、键盘与触控操作、焦点恢复、按需加载与重试；增加浏览器回归，并在 Windows 虚拟机中验证实际 DSH 桌面应用。
