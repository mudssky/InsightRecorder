## 目标

- 在 `src/main/db` 移除对 `better-sqlite3` 的直接依赖与使用，统一改为 Drizzle ORM。
- 保持当前 SQLite 文件与表结构不变（沿用 `userData/insightrecorder.db`），无数据迁移。
- 将 DB 层 API 从同步改为异步 Promise，更新主进程 IPC 调用为 `await`。

## 驱动选择

- 采用 `drizzle-orm/sqlite3`（依赖 `sqlite3` 包）作为 Node/Electron 主进程的 SQLite 驱动。
- 原因：稳定、文档完善、与 Drizzle 深度兼容；本地文件访问无网络依赖。
- 备选方案：若后续 Electron 原生构建对 `sqlite3` 有阻碍，可切换 `drizzle-orm/libsql` + `@libsql/client`。（本次先以 `sqlite3` 实现）

## 依赖与配置

- `package.json`：移除 `better-sqlite3`，新增 `drizzle-orm` 与 `sqlite3`。
- TypeScript 不需要额外变更；保留现有 ESLint/Prettier 规则。

## 连接与初始化

- 文件：`src/main/db/connection.ts`
- 替换为 `sqlite3.Database` + Drizzle：
  - 路径仍使用 `app.getPath('userData')` 拼接 `insightrecorder.db`。
  - 初始化后执行 `PRAGMA journal_mode=WAL`。
  - 用 `drizzle(sqlite3Db)` 生成 `db` 实例并导出 `getDb(): DrizzleDb`。
  - 保留一次性建表逻辑：沿用现有 `CREATE TABLE IF NOT EXISTS ...` SQL，通过 `sqlite3` 的 `exec` 执行。

## Schema 定义

- 新增文件：`src/main/db/schema.ts`（仅定义表，不引入业务逻辑）：
  - `devices`：字段保持与现有一致（`id` 主键、`type` 默认值、`timestamps` 等）。
  - `files`：`fingerprint` 唯一索引；含 `deviceId` 外键。
  - `sync_jobs`、`sync_events`：主键与外键与现有保持一致。
  - 使用 `sqliteTable`、`integer`、`text` 等定义，必要索引通过 `uniqueIndex`/`index`。

## DB 模块改造

- 所有导出函数改为 `async`，内部使用 Drizzle：
  - `devices.ts`
    - `upsertDevice(row)`：`insert(devices).values(...).onConflictDoUpdate({ target: devices.id, set: {...} })`。
    - `getDevice(id)`：`select().from(devices).where(eq(devices.id, id)).limit(1)`。
    - `updateDevice(id, partial)`：`update(devices).set({...}).where(eq(devices.id, id))`。
    - `updateDeviceLastSync(id, ts)`：更新 `lastSyncAt`。
    - `listDevices()`：`select().from(devices).orderBy(desc(devices.updatedAt))`。
  - `files.ts`
    - `upsertFiles(rows)`：事务 `db.transaction(async (tx)=>{ for row → insert ... onConflictDoUpdate({ target: files.fingerprint, set: { size, mtimeMs, contentHash, title } }) })`。
  - `jobs.ts`
    - `createJob(job)`：`insert(sync_jobs).values(job)`。
    - `updateJob(id, partial)`：`update(sync_jobs).set(...).where(eq(sync_jobs.id, id))`。
  - `events.ts`
    - `appendEvents(events)`：批量 `insert(sync_events).values(events)`（或事务）。
  - `stats.ts`
    - `countFilesByDevice(deviceId)`：`select({ c: sql<number>`count(1)` }).from(files).where(eq(files.deviceId, deviceId))`。
    - `countSyncedByDevice(deviceId)`：`select({ c: sql<number>`sum(copiedCount)` }).from(sync_jobs).where(eq(sync_jobs.deviceId, deviceId))`。
- 类型：优先使用 Drizzle `InferSelectModel/InferInsertModel`，并与现有 `types.ts` 对齐；如需保留现有类型导出以兼容 IPC 层，可在 Drizzle 结果上做轻度映射。

## IPC 调整（主进程）

- 受影响文件与改动点：
  - `src/main/ipc/deviceList.ts`
    - `upsertDevice(...)` 调用改为 `await upsertDevice(...)`。
    - `devices:persisted:list` 中 `listDevices()` 改为 `await listDevices()`。
  - `src/main/ipc/deviceSettings.ts`
    - `dbGetDevice(id)`、`upsertDevice(...)`、`dbUpdateDevice(...)` 改为 `await`。
  - `src/main/ipc/export.ts`
    - `getDevice(deviceId)` 改为 `await`（动态导入后）。
    - `updateDeviceLastSyncSafe` 改为异步并 `await updateDeviceLastSync(...)`。
  - `src/main/ipc/deviceStats.ts`
    - `countFilesByDevice(id)`、`countSyncedByDevice(id)`、`dbGetDevice(id)` 改为 `await`。
- 所有 `ipcMain.handle` 处理器保持 `async`，返回 Promise；渲染层无需改动（均通过 `invoke`）。

## 兼容与迁移

- 数据库文件与表结构不变；Drizzle 仅替换访问方式，无需迁移。
- 事务语义：由 `better-sqlite3` 的同步事务改为 Drizzle/`sqlite3` 的异步事务；功能等价。
- 保留 WAL 模式，持续提升并发读写体验。

## 验证与质量流程

- 安装与构建：`pnpm install`（依赖变更）
- 一次性质量检查：`pnpm qa`（`typecheck`/`lint`/`format`）
- 构建与冒烟：`pnpm build` → `pnpm start`，验证设备枚举、设置读写、导出流程与统计页均无异常。
- 若测试暂缺：在交付说明中标注“测试缺失”并补充 TODO（不新增文件，除非用户要求）。

## 影响面与风险

- 原同步 API 改为异步后，主进程 IPC 改动较集中但可控；渲染层调用不受影响。
- `sqlite3` 为原生模块，Electron 构建可能需额外处理；如遇到构建问题，预案切换至 `libsql` 驱动。

## 修改文件清单（路径与关键点）

- `src/main/db/connection.ts`：替换连接实现，保留 WAL 与建表。
- `src/main/db/schema.ts`：新增 Drizzle 表定义。
- `src/main/db/devices.ts`：所有方法改为异步并使用 Drizzle。
- `src/main/db/files.ts`、`src/main/db/jobs.ts`、`src/main/db/events.ts`、`src/main/db/stats.ts`：按上文改为异步 Drizzle 查询。
- `src/main/db/index.ts`：继续聚合导出（必要时更新导出类型）。
- `src/main/ipc/*.ts`：调用处改为 `await`，并保持原有返回结构。

## 交付结果

- 完成依赖替换与 DB 层/IPC 异步改造，功能一致。
- 通过 `qa`、`build`、`start` 的本地验证；如出现 `sqlite3` 构建阻碍，将提供 `libsql` 驱动切换补案。

请确认以上方案后，我将按此计划实施并完成改造与验证。
