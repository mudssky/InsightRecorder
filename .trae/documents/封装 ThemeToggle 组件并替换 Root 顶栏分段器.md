## 组件目标

- 替代当前顶栏分段器（系统/浅色/深色），提供更紧凑的一键+下拉菜单式主题切换控件
- 三态支持：system / light / dark，实时联动 AntD 与 Tailwind（沿用现有 ThemeProvider）
- 右上角放置，保持与导航一致的视觉与交互

## 交互设计

- 顶栏右侧展示单个按钮：当前模式图标 +（可选）标签文本
- 点击按钮弹出下拉菜单（Dropdown）列出三项：系统、浅色、深色；选中立即应用
- 可选增强：
  - Icon-only 紧凑模式（仅显示图标，配 Tooltip“主题”）
  - 单击按钮循环切换三态（默认关闭）

## 组件 API

- 组件：`ThemeToggle`
- Props：
  - `variant?: 'button' | 'icon'`（默认 `button`）
  - `showLabel?: boolean`（默认 true）
  - `size?: 'small' | 'middle'`（默认 `middle`）
  - `className?: string`
- 行为：从 `useTheme()` 读取 `themeMode`，调用 `setThemeMode(next)`；仅渲染 UI，不处理持久化（沿用现有逻辑）

## 技术实现

- 使用 AntD 6 组件：`Dropdown` + `Button`（或 `Tooltip` + `Button` 在 icon 模式）
- 图标：`DesktopOutlined`（system）/ `SunOutlined`（light）/ `MoonOutlined`（dark）
- 类型：复用 `ThemeMode`（来自 `src/renderer/src/theme/context.ts`），避免 any
- 样式：
  - 顶栏控件容器采用 `px-[20px]`
  - 文本颜色遵循顶栏主题（`dark:text-gray-200`），按钮保留 AntD 主题算法

## 放置与替换

- 新增文件：`src/renderer/src/components/ThemeToggle.tsx`
- 在 `Root.tsx` 顶栏右侧替换 `/src/renderer/src/routes/Root.tsx#L52-62` 的分段器为：`<ThemeToggle variant="button" showLabel={false} size="small" />`
- 可选复用：在 `Settings.tsx` 中用 `ThemeToggle` 替换分段器（保持页面一致性）

## 与现有机制的关系

- 不改动 `ThemeProvider` 与 `preload`/IPC 持久化；切换后仍由现有逻辑写回 electron-store
- ConfigProvider 的 `algorithm`（default/dark）继续自动驱动 AntD 组件的主题

## 验证与自测

- 运行 `pnpm qa`（typecheck/lint/format 全部通过）
- 运行 `pnpm run build` 构建
- 冒烟启动 `pnpm run start`：
  - 切换三态，确认 AntD 与 Tailwind 同步响应
  - 关闭并重启，确认上次选择被恢复（持久化生效）

## 后续可选增强

- 支持按钮单击循环切换（`system→light→dark→system`）
- 文案国际化（复用项目 i18n 方案或简单常量映射）
- 监听系统主题更新时自动更新按钮图标（当前已由 ThemeProvider 处理，可以在组件中反映）
