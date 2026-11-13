# Custom Artist Theme Pack (`custom-themes/`)

这个目录用于在官方 `Codex-Dream-Skin`（当前上游基线 `v1.5.21`）中**隔离存放、安装与导出**你的 5 套个人定制明星/艺人皮肤，与官方核心运行时、官方预设以及社区工作台完全解耦。

## 目录结构

- [themes/](file:///d:/Coding/自研项目/Codex-Dream-Skin/custom-themes/themes) — 完整本地版自定义皮肤（含多图路由 `artist-v2` 与艺人叠层 `artist-v1`）：
  - `custom-aurora-soft-ascension` (`schemaVersion: 2`, `customPack: "artist-v2"`, 4 张页面图 + 柔边遮罩)
  - `custom-aurora-runaway-bloom` (`schemaVersion: 1`, `customPack: "artist-v1"`)
  - `custom-billie-blue-hour` (`schemaVersion: 1`, `customPack: "artist-v1"`, Olive Paper 浅色)
  - `custom-billie-mirror-moods` (`schemaVersion: 2`, `customPack: "artist-v2"`, 3 张分场景图 + 按路由切换配色)
  - `custom-justin-purpose-noir` (`schemaVersion: 1`, `customPack: "artist-v1"`)
- [studio-v1/](file:///d:/Coding/自研项目/Codex-Dream-Skin/custom-themes/studio-v1) — 由 [export-studio-v1.mjs](file:///d:/Coding/自研项目/Codex-Dream-Skin/tools/export-studio-v1.mjs) 自动导出的**官方工作台 / Safe CSS (`schemaVersion: 1`) 兼容包**（目录与 `.zip` 压缩包），可直接导入 [DreamSkin Studio](https://dreamskin.cc/studio) 进行在线微调或通过本地 ZIP 导入测试。
- [Install-Custom-Themes.ps1](file:///d:/Coding/自研项目/Codex-Dream-Skin/custom-themes/Install-Custom-Themes.ps1) — 一键把 5 套完整皮肤安装到 `%LOCALAPPDATA%\CodexDreamSkin\themes\`（不会覆盖官方 `preset-*` 或当前正在使用的主题）。

## 安装与使用

在 PowerShell 中执行（从本仓库根目录）：

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\custom-themes\Install-Custom-Themes.ps1
```

如果只想同步主题文件、不重装 `%LOCALAPPDATA%\CodexDreamSkin\runtime`：

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\custom-themes\Install-Custom-Themes.ps1 -SkipRuntimeSync
```

安装完成后，在托盘菜单 **Saved Themes（已保存主题）** 或 **Theme Manager** 中即可与官方皮肤自由切换；切换回官方/社区皮肤时，[artist-overlay.js](file:///d:/Coding/自研项目/Codex-Dream-Skin/windows/assets/custom-pack/artist-overlay.js) 会彻底清理所有自定义样式、DOM 节点、类名与 `blob:` URL。

## 重新生成工作台导入包 (`studio-v1/`)

```bash
node tools/export-studio-v1.mjs
```

> 说明：官方 [DreamSkin Studio](https://dreamskin.cc/studio) 目前遵循 `schemaVersion: 1` + 单张背景图 + [Safe CSS 白名单](file:///d:/Coding/自研项目/Codex-Dream-Skin/windows/assets/safe-css-policy.json)（仅允许 `[data-ds-part="..."]` 选择器），不支持上传 `artist-v2` 的多图分路由和自定义 Home 快捷卡片注入。完整多图与艺人卡片视觉能力请使用 `themes/` + 本仓库的 `custom-pack` 运行时叠层。
