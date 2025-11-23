## 结论

- 可以直接使用 `@renderer/*` 引入 `AppSettings` 类型；当前 `tsconfig.node.json` 已配置 `@renderer/*` → `src/renderer/src/*`，在主进程中用 `import type` 引入会被编译期移除，不影响打包与运行。

## 变更内容

1. 主进程类型引用

- 将 `src/main/ipc/appSettings.ts` 中第 3 行改为：
- `import type { AppSettings } from '@renderer/config/appSettings.schema'`
- 保持 `type-only` 形式，确保存根不参与运行时代码。

2. 预加载类型引用（已对齐方案）

- 维持 `src/preload/settings.ts` 使用 `import type { AppSettings } from '@renderer/config/appSettings.schema'`，统一来源，避免重复维护。

3. 校验与构建

- 运行：`pnpm qa` → 确认类型检查与 Lint 通过
- 运行：`pnpm run build` → 构建通过
- 运行：`pnpm run start` → 冒烟验证

## 注意事项

- 仅限类型引用；如将来需要值级别导入（运行时），需在 Vite alias 或打包配置中同步声明并评估主/渲染层耦合。
- 如需进一步收敛，建议把设备设置也抽成 Zod Schema，并统一以 `z.infer` 暴露类型，主/预加载/渲染都使用该单一来源。
