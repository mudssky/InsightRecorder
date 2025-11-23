# InsightRecorder 项目规则（Project Rules）

> 该文件用于约束 AI 在本项目内的行为与交付流程，确保改动在提交前完成自我验证并可在 Windows 11 环境稳定运行。项目规则仅在当前项目生效，影响 IDE 中的 AI 行为与工作流。

## 1. Tech Stack

- Electron 39 + electron-vite 4（主/渲染分离，默认启用 `contextIsolation`、`sandbox`）
- 打包：electron-builder 26（Windows 使用 NSIS）
- 前端：React 19、Vite 7
- 语言：TypeScript 5
- 代码质量：ESLint 9、Prettier 3（本仓库已配置）
- 操作系统：Windows 11

脚本来源于本仓库 `package.json`：

- `format`: `prettier --write .`
- `lint`: `eslint --cache .`
- `typecheck`: `tsc --noEmit`（含 node/web 两套 tsconfig）
- `build`: `electron-vite build`（前置 `typecheck`）
- `start`: `electron-vite preview`
- `qa`: `pnpm typecheck && pnpm lint && pnpm format`（一次性执行格式化、类型检查与代码检查）

包管理器：pnpm（仓库包含 `pnpm-lock.yaml`）。统一使用 `pnpm` 运行命令。

## 2. Code Standards

- 命名
  - 变量/函数：`camelCase`
  - React 组件/类型/枚举：`PascalCase`
  - Hook：`useXxx`
  - 文件：TypeScript 使用 `.ts`/`.tsx`，组件文件名与导出保持一致
- 目录结构（保持与现有一致）
  - `src/main`：主进程入口与主逻辑
  - `src/preload`：预加载脚本与 `contextBridge` 暴露 API；类型定义在 `index.d.ts`
  - `src/renderer`：前端 UI（React），静态入口 `renderer/index.html`
- TypeScript
  - 禁用 `any`：优先 `unknown` +窄化；公共导出需显式返回类型
  - IPC 与 `preload` 暴露 API 必须有类型定义并与渲染端一致
- React
  - 仅使用函数组件；遵循 `eslint-plugin-react` 与 `react-hooks` 规则
  - 避免在渲染过程中产生副作用；副作用统一置于 `useEffect`
- 风格与格式化
  - 遵循仓库 `.prettierrc.yaml`：`singleQuote: true`、`semi: false`、`printWidth: 100`、`trailingComma: none`
  - 所有改动必须可通过 `pnpm run format`
- 安全基线（Electron）
  - 保持 `contextIsolation: true`、`sandbox: true`
  - 禁用 `remote` 模块；仅通过 `preload`/`contextBridge` 暴露白名单 API
  - IPC 必须进行 schema 校验与最小权限设计

## 3. Development Workflow（必须执行）

下述步骤为 AI 在完成任何代码改动后的固定动作序列；出现报错必须按 “Fix-before-Submit” 原则自动修复并重试，直到全部通过。

### Step-by-Step

1. 准备环境

- 如依赖变更，执行：`pnpm install`

2. 代码实现

- 按上述 Code Standards 完成改动；如涉及 `preload` 与渲染通信，先补齐类型定义

3. 类型检查（Typecheck）

- 运行：`pnpm run typecheck`
- 若报错，按规则修复类型并重试，直至 0 error

4. 代码检查（Linting）

- 运行：`pnpm run lint`
- 如有错误或可自动修复项：`pnpm exec eslint --fix .`，随后再次运行 `pnpm run lint`

5. 格式化（Formatting）

- 运行：`pnpm run format`
- 若存在未格式化文件，自动修复并重新运行直至无差异

3,4,5步骤可以 使用 `pnpm qa` 一次性执行

6. 测试（Testing）

- 若存在测试脚本：`pnpm run test`（单元测试建议使用 Vitest；端到端可用 Playwright）
- 若当前未配置测试脚本：
  - 记录 TODO：“补充 Vitest 最小用例与运行脚本”；本次继续执行后续验证步骤

7. 构建（Build & Smoke）

- 运行：`pnpm run build`
- 构建失败必须修复后重试；通过后执行冒烟预览：`pnpm run start`，验证应用可启动且关键改动路径无运行时错误

8. 文档更新（Documentation）

- 如改动影响使用方式或约束：更新 `README.md`
- 如影响产品功能：在 `docs/初始需求文档.md` 添加“实现进展/注意事项”小节（附日期与概要）
- 如新增脚本或规则：同步修订本文件

9. 结果输出（Report）

- 在交付说明中列出本次执行命令与结果摘要（格式化/lint/typecheck/test/build/start）

### Fix-before-Submit 原则

- 任一步骤失败（非 0 退出码或运行时异常）：AI 必须定位原因、修改代码或配置并重试该步骤
- 禁止在未通过的情况下结束任务或提交结果

## 4. Verification Rules（完成判定）

任务仅在满足以下条件时视为“完成”：

- `pnpm run format` 无待改动
- `pnpm run lint` 0 error（允许 warnings 但需在交付说明中说明原因）
- `pnpm run typecheck` 0 error
- 测试：如存在，全部通过（0 failed）
- 构建：`pnpm run build` 成功
- 冒烟：`pnpm run start` 可启动，无与本次改动相关的未处理异常

若测试未配置：必须在交付说明中包含“测试缺失”提示与后续 TODO，且仍需满足其余校验。

## 5. 任务完成后的文档维护

- 更新 `README.md` 与 `docs/初始需求文档.md` 的相关章节（新增命令、配置变更、功能影响）
- 如本规则文件需要更新（新增校验步骤或脚本）：同步修订并保存
- 建议维护 `CHANGELOG.md`（可选），记录版本变更与校验状态

---

### 摘要（供 AI 快速引用）

- 包管理器：`pnpm`
- 格式化：`pnpm run format`
- Lint：`pnpm run lint` → 失败时 `pnpm exec eslint --fix .` 并重试
- 类型检查：`pnpm run typecheck`
- 测试：有则 `pnpm run test`；暂无则记录 TODO
- 构建：`pnpm run build`，随后 `pnpm run start` 冒烟
- 原则：发现错误必须自动修复并重跑，Lint/Typecheck/Build/（Test）全部通过才算完成
