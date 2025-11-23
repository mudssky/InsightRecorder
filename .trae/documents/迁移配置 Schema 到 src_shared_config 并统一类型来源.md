## 目标

- 将 `src/renderer/src/config/*` 的配置 Schema 迁移到 `src/shared/config/*`，统一主/预加载/渲染层的类型与工具函数来源，减少多处维护。

## 迁移范围

- 文件：
  - `appSettings.schema.ts`
  - `exportHistory.schema.ts`
  - `exportIndex.schema.ts`
  - `themeSettings.schema.ts`
  - `index.ts`（如仅 re-export，则同步迁移并更新）

## 实施步骤

1. 创建共享目录

- 新建 `src/shared/config/`

2. 移动文件

- 将上述 Schema 文件从 `src/renderer/src/config/` 移至 `src/shared/config/`
- 保持导出接口与 `parse*` 工具函数不变

3. 更新别名与路径映射

- `electron.vite.config.ts` 的 `renderer.resolve.alias` 增加：
  - `@shared: resolve('src/shared')`
- `tsconfig.node.json` 与 `tsconfig.web.json` 的 `compilerOptions.paths` 增加：
  - `"@shared/*": ["src/shared/*"]`
- `tsconfig.node.json` 的 `include` 增加：
  - `"src/shared/**/*"`
- 移除此前为解决 TS6307 添加的特定 `include: src/renderer/src/config/appSettings.schema.ts`

4. 批量替换 import

- 将项目内对 `@renderer/config/*` 或相对路径指向 `renderer/src/config` 的引入替换为 `@shared/config/*`
- 关键文件：
  - `src/main/ipc/appSettings.ts`（type-only 引入）
  - `src/preload/settings.ts`（type-only 引入）
  - `src/renderer/src/routes/Settings.tsx`（type-only 引入）
  - 若有其他页面/模块使用 `parseAppSettings` 等，也改为从 `@shared/config/*` 引入

5. 清理与一致性

- 确认 `src/renderer/src/config/index.ts` 若存在 re-export，迁移到 `src/shared/config/index.ts` 并更新内容
- 删除空的旧目录文件或保留兼容 re-export（若需要临时过渡）

6. 校验

- 运行：
  - `pnpm qa`（类型检查、Lint、格式化）
  - `pnpm run build`（构建）
  - `pnpm run start`（冒烟）
- 关注：
  - Renderer 正常解析 `@shared` 别名
  - 主/预加载仅进行 type-only 导入，不产生运行时耦合

## 影响与注意

- 运行时引入：
  - 主/预加载文件仅进行 `import type`，不会把 renderer/shared 运行时代码打入主/预加载包；renderer 可正常从 `@shared` 获取运行时函数（如 `parse*`）。
- 循环依赖风险：
  - 共享目录仅包含纯 Schema 与工具函数，避免依赖 renderer UI/状态模块。

## 交付标准

- 类型与构建通过；应用启动正常
- 全仓 import 指向 `@shared/config/*`，无遗留相对路径到 renderer/config
- 记录必要变更（如需要）并确保后续新增字段只需改一处 Schema
