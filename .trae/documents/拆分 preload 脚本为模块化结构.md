## 目标

- 将 `src/preload/index.ts` 中的 API 拆分为多个按领域归类的模块，提升可维护性与可扩展性。
- 保持对渲染端的 `window.api` 与类型声明不变，保证零破坏升级。

## 当前结构

- 单文件暴露：`contextBridge.exposeInMainWorld('api', api)`，`api` 包含主题、设置、设备、导出等方法。
- 类型集中在 `src/preload/index.d.ts` 的 `declare global { interface Window { api: ... } }`。

## 拆分方案（新文件）

- `src/preload/theme.ts`
  - `getSystemTheme`
  - `onSystemThemeUpdated`
  - `getUserThemeMode`
  - `setUserThemeMode`
- `src/preload/settings.ts`
  - `getAppSetting`
  - `updateAppSettings`
  - `getAppSettings`
  - `setAppSettings`
- `src/preload/devices.ts`
  - `listDevices`
  - `onDeviceChanged`
- `src/preload/export.ts`
  - `startExport`
  - `getExportSummary`
  - `onExportProgress`
  - `cancelExport`

## 汇总与暴露

- 修改 `src/preload/index.ts`：
  - 从各模块导入函数，组装为同名的 `api` 对象。
  - 继续通过 `contextBridge` 暴露 `electron` 与 `api`。
  - 保持 `process.contextIsolated` 分支逻辑不变（兼容非隔离场景）。

## 类型策略

- 保留 `src/preload/index.d.ts` 不变，确保渲染端类型兼容。
- 如后续需要进一步模块化类型，可在每个模块新增 `*.d.ts` 进行 `declare global` 合并，但本次不改动声明，避免类型抖动。

## 验证步骤

- 运行 `pnpm qa`（typecheck、lint、format 一次性执行）。
- 构建：`pnpm run build`。
- 冒烟：`pnpm run start`，验证设备页与主题切换、导出进度事件等路径正常。

## 兼容性与安全

- 不更改 IPC 通道名与参数结构，保持主/渲染交互稳定。
- 继续遵守 Electron 安全基线，仅白名单 API 暴露。

## 改动范围说明

- 仅新增 4 个模块文件并调整 `index.ts` 的导入与组装。
- 不修改渲染端代码；不引入新依赖。
