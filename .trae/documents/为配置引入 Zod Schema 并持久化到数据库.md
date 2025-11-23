## 目标

- 在渲染端新增 `src/renderer/src/config`，用 Zod 为所有配置定义 Schema 与类型
- 统一配置读取与校验，防止非法值进入业务流程
- 将配置保存到“数据库”（现有主进程 `electron-store` 持久化层），并通过 IPC 双向交互

## 现状梳理

- 渲染端未存在 `src/renderer/src/config` 目录
- 已安装 `zod@^4.1.12`，代码中尚未引用
- 主进程存储：`electron-store` 多实例
  - `settings`：`themeMode`（主题模式）
  - `app-settings`：`exportTargetPath`、`renameTemplate`、`extensions`、`concurrency`、`retryCount`、`clearAfterExport`
  - `export-index`：去重指纹（`Record<string, true>`）
  - `export-history`：导出任务历史（`{ tasks: ExportTaskSummary[] }`）
- 渲染端 API（预加载暴露）：
  - `getUserThemeMode` / `setUserThemeMode`（src/preload/index.ts:30-35）
  - `getAppSetting` / `updateAppSettings`（src/preload/index.ts:36-70）

## 方案设计

- 用 Zod 在渲染端集中定义 Schema 与类型，提供 `parse`/`safeParse` 工具函数
- IPC 输入/输出统一经 Zod 校验，避免脏数据写入 `electron-store`
- 维持现有 API 不破坏，用“新增”方式提供更完整读写能力（如一次性获取/保存全部设置）

## 新增目录与文件

- `src/renderer/src/config/`（新建）
  - `appSettings.schema.ts`
    - AppSettingsSchema：
      - `exportTargetPath: z.string()`（允许空字符串）
      - `renameTemplate: z.string()`（默认 `{date:YYYYMMDD}-{time:HHmmss}-{title}-{device}`）
      - `extensions: z.array(z.string()).min(1)`（如无则给默认 `['wav','mp3','m4a']`）
      - `concurrency: z.number().int().min(1)`
      - `retryCount: z.number().int().min(0)`
      - `clearAfterExport: z.boolean()`
    - 导出 `type AppSettings = z.infer<typeof AppSettingsSchema>` 与 `parseAppSettings`
  - `themeSettings.schema.ts`
    - ThemeSettingsSchema：`z.enum(['light','dark','system'])`
    - `type ThemeMode = z.infer<typeof ThemeSettingsSchema>`
  - `exportHistory.schema.ts`
    - 导出任务项 Schema：与主进程 `ExportTaskSummary` 一致（id、startedAt、endedAt、status、total、success、failed、error、deviceIds）
    - `ExportHistorySchema: z.object({ tasks: z.array(ExportTaskSummarySchema) })`
  - `exportIndex.schema.ts`
    - `ExportIndexSchema: z.record(z.literal(true))`（字符串键 → true）
  - `index.ts`
    - 统一导出上述 Schema/类型与工具函数

## IPC & 类型增强（向后兼容）

- 预加载（`src/preload/index.ts`）新增：
  - `getAppSettings(): Promise<AppSettings>`（一次性获取全部设置并在渲染端 Zod 校验）
  - `setAppSettings(payload: AppSettings): Promise<boolean>`（整体保存；内部仍调用现有 `app-settings:update`，并在渲染端校验）
- 类型声明（`src/preload/index.d.ts`）同步新增上述 API 的类型定义
- 说明：保留现有 `getAppSetting(key)` 与 `updateAppSettings(partial)`，旧代码不受影响

## 主进程存储层（不变更依赖，增强校验）

- 在 `src/main/index.ts` 的 IPC 处理处，对入参做最小校验：
  - `app-settings:update`：对各键做基本类型检查（number/string/boolean 与数组），非法值忽略
  - 新增 `app-settings:get-all`：返回 `appSettingsStore` 的全量对象
  - 如需更严格校验，可在主进程引入相同 Zod Schema（后续增量迭代）
- 仍使用 `electron-store` 作为“数据库”持久化，避免引入 SQLite 等重型依赖

## 渲染端使用方式

- 组件/页面中：
  - 获取：`const settings = await window.api.getAppSettings()` → 经 Zod 校验得到 `AppSettings`
  - 更新：
    - 局部：`await window.api.updateAppSettings({ concurrency: 2 })`
    - 整体：`await window.api.setAppSettings(next)`（先 Zod 校验再写入）
  - 主题：`getUserThemeMode()/setUserThemeMode()` 保持不变；如需整体读写可拓展 `ThemeSettings`

## 兼容性与迁移

- 读取现有 `electron-store` 值时：若缺失或类型不符，按 Schema 默认值修正
- 未来可引入 `schemaVersion` 与迁移器（`zod` + `superRefine`）

## 验证步骤（按项目规则）

1. 代码实现完成后：`pnpm qa`（含 typecheck/lint/format）
2. 构建与冒烟：`pnpm run build` → `pnpm run start`
3. 手动验证：
   - 空目录/无配置首次启动，能获取默认设置
   - 修改设置并重启，值正确持久化
   - 非法值（负并发、空扩展名等）被拒绝或修正

## 交付物

- 新增 `src/renderer/src/config/*`（Zod Schema 与类型）
- 扩展预加载 API 与类型声明（向后兼容）
- 主进程 IPC 读取全量配置（可选更严格校验）
- 使用说明与最小示例（在改动的模块内内联注释说明）
