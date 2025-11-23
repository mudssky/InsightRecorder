import Database from 'better-sqlite3'
import { app } from 'electron'

export interface DeviceRow {
  id: string
  label?: string
  mountpoint: string
  type: 'recorder' | 'generic' | 'ignored'
  autoSync: number
  deleteSourceAfterSync: number
  syncRootDir?: string
  folderNameRule?: string
  folderTemplate?: string
  extensions?: string
  minSize?: number
  maxSize?: number
  createdAt: number
  updatedAt: number
  lastSeenAt?: number
  lastSyncAt?: number
}

export interface FileRow {
  id?: number
  deviceId: string
  relativePath: string
  size: number
  mtimeMs: number
  fingerprint: string
  contentHash?: string
  title?: string
}

export interface SyncJobRow {
  id: string
  deviceId: string
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
  startedAt: number
  endedAt?: number
  copiedCount: number
  skippedCount: number
  failedCount: number
}

export interface SyncEventRow {
  id?: number
  jobId: string
  stage: 'copied' | 'skip' | 'failed'
  fileId?: number
  ts: number
  error?: string
}

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db
  const userData = app.getPath('userData')
  const dbPath = `${userData}/insightrecorder.db`
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      label TEXT,
      mountpoint TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'generic',
      autoSync INTEGER NOT NULL DEFAULT 0,
      deleteSourceAfterSync INTEGER NOT NULL DEFAULT 0,
      syncRootDir TEXT,
      folderNameRule TEXT,
      folderTemplate TEXT,
      extensions TEXT,
      minSize INTEGER,
      maxSize INTEGER,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      lastSeenAt INTEGER,
      lastSyncAt INTEGER
    );
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deviceId TEXT NOT NULL,
      relativePath TEXT NOT NULL,
      size INTEGER NOT NULL,
      mtimeMs INTEGER NOT NULL,
      fingerprint TEXT NOT NULL UNIQUE,
      contentHash TEXT,
      title TEXT,
      FOREIGN KEY(deviceId) REFERENCES devices(id)
    );
    CREATE INDEX IF NOT EXISTS idx_files_device_rel ON files(deviceId, relativePath);
    CREATE TABLE IF NOT EXISTS sync_jobs (
      id TEXT PRIMARY KEY,
      deviceId TEXT NOT NULL,
      status TEXT NOT NULL,
      startedAt INTEGER NOT NULL,
      endedAt INTEGER,
      copiedCount INTEGER NOT NULL DEFAULT 0,
      skippedCount INTEGER NOT NULL DEFAULT 0,
      failedCount INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(deviceId) REFERENCES devices(id)
    );
    CREATE TABLE IF NOT EXISTS sync_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jobId TEXT NOT NULL,
      stage TEXT NOT NULL,
      fileId INTEGER,
      ts INTEGER NOT NULL,
      error TEXT,
      FOREIGN KEY(jobId) REFERENCES sync_jobs(id),
      FOREIGN KEY(fileId) REFERENCES files(id)
    );
  `)
  return db
}

export function upsertDevice(row: Partial<DeviceRow> & { id: string; mountpoint: string }): void {
  const db = getDb()
  const now = Date.now()
  const existing = db.prepare('SELECT id FROM devices WHERE id = ?').get(row.id)
  if (existing) {
    db.prepare(
      `UPDATE devices SET label=?, mountpoint=?, type=?, autoSync=?, deleteSourceAfterSync=?, syncRootDir=?, folderNameRule=?, folderTemplate=?, extensions=?, minSize=?, maxSize=?, updatedAt=?, lastSeenAt=? WHERE id=?`
    ).run(
      row.label ?? null,
      row.mountpoint,
      row.type ?? 'generic',
      row.autoSync ? 1 : 0,
      row.deleteSourceAfterSync ? 1 : 0,
      row.syncRootDir ?? null,
      row.folderNameRule ?? null,
      row.folderTemplate ?? null,
      row.extensions ?? null,
      row.minSize ?? null,
      row.maxSize ?? null,
      now,
      row.lastSeenAt ?? now,
      row.id
    )
  } else {
    db.prepare(
      `INSERT INTO devices (id,label,mountpoint,type,autoSync,deleteSourceAfterSync,syncRootDir,folderNameRule,folderTemplate,extensions,minSize,maxSize,createdAt,updatedAt,lastSeenAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      row.id,
      row.label ?? null,
      row.mountpoint,
      row.type ?? 'generic',
      row.autoSync ? 1 : 0,
      row.deleteSourceAfterSync ? 1 : 0,
      row.syncRootDir ?? null,
      row.folderNameRule ?? null,
      row.folderTemplate ?? null,
      row.extensions ?? null,
      row.minSize ?? null,
      row.maxSize ?? null,
      now,
      now,
      row.lastSeenAt ?? now
    )
  }
}

export function getDevice(id: string): DeviceRow | undefined {
  const db = getDb()
  const row = db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as DeviceRow | undefined
  return row
}

export function updateDevice(id: string, partial: Partial<DeviceRow>): void {
  const db = getDb()
  const existing = getDevice(id)
  if (!existing) return
  const merged: DeviceRow = {
    ...existing,
    ...partial,
    updatedAt: Date.now()
  }
  db.prepare(
    `UPDATE devices SET label=?, mountpoint=?, type=?, autoSync=?, deleteSourceAfterSync=?, syncRootDir=?, folderNameRule=?, folderTemplate=?, extensions=?, minSize=?, maxSize=?, updatedAt=?, lastSeenAt=?, lastSyncAt=? WHERE id=?`
  ).run(
    merged.label ?? null,
    merged.mountpoint,
    merged.type,
    merged.autoSync ? 1 : 0,
    merged.deleteSourceAfterSync ? 1 : 0,
    merged.syncRootDir ?? null,
    merged.folderNameRule ?? null,
    merged.folderTemplate ?? null,
    merged.extensions ?? null,
    merged.minSize ?? null,
    merged.maxSize ?? null,
    merged.updatedAt,
    merged.lastSeenAt ?? null,
    merged.lastSyncAt ?? null,
    id
  )
}

export function countFilesByDevice(deviceId: string): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(1) as c FROM files WHERE deviceId = ?').get(deviceId) as {
    c: number
  }
  return row?.c ?? 0
}

export function countSyncedByDevice(deviceId: string): number {
  const db = getDb()
  const row = db
    .prepare('SELECT SUM(copiedCount) as c FROM sync_jobs WHERE deviceId = ?')
    .get(deviceId) as { c: number }
  return row?.c ?? 0
}

export function upsertFiles(rows: FileRow[]): void {
  const db = getDb()
  const insert = db.prepare(
    'INSERT OR IGNORE INTO files(deviceId,relativePath,size,mtimeMs,fingerprint,contentHash,title) VALUES (?,?,?,?,?,?,?)'
  )
  const update = db.prepare(
    'UPDATE files SET size=?, mtimeMs=?, contentHash=?, title=? WHERE fingerprint=?'
  )
  const trx = db.transaction((items: FileRow[]) => {
    for (const r of items) {
      insert.run(
        r.deviceId,
        r.relativePath,
        r.size,
        r.mtimeMs,
        r.fingerprint,
        r.contentHash ?? null,
        r.title ?? null
      )
      update.run(r.size, r.mtimeMs, r.contentHash ?? null, r.title ?? null, r.fingerprint)
    }
  })
  trx(rows)
}

export function createJob(job: SyncJobRow): void {
  const db = getDb()
  db.prepare(
    'INSERT INTO sync_jobs(id,deviceId,status,startedAt,endedAt,copiedCount,skippedCount,failedCount) VALUES (?,?,?,?,?,?,?,?)'
  ).run(
    job.id,
    job.deviceId,
    job.status,
    job.startedAt,
    job.endedAt ?? null,
    job.copiedCount,
    job.skippedCount,
    job.failedCount
  )
}

export function updateJob(id: string, partial: Partial<SyncJobRow>): void {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM sync_jobs WHERE id = ?').get(id) as
    | SyncJobRow
    | undefined
  if (!existing) return
  const merged: SyncJobRow = { ...existing, ...partial }
  db.prepare(
    'UPDATE sync_jobs SET status=?, startedAt=?, endedAt=?, copiedCount=?, skippedCount=?, failedCount=? WHERE id=?'
  ).run(
    merged.status,
    merged.startedAt,
    merged.endedAt ?? null,
    merged.copiedCount,
    merged.skippedCount,
    merged.failedCount,
    id
  )
}

export function appendEvents(events: SyncEventRow[]): void {
  const db = getDb()
  const stmt = db.prepare('INSERT INTO sync_events(jobId,stage,fileId,ts,error) VALUES (?,?,?,?,?)')
  const trx = db.transaction((items: SyncEventRow[]) => {
    for (const e of items) stmt.run(e.jobId, e.stage, e.fileId ?? null, e.ts, e.error ?? null)
  })
  trx(events)
}

export function updateDeviceLastSync(id: string, ts: number): void {
  const db = getDb()
  db.prepare('UPDATE devices SET lastSyncAt=? WHERE id=?').run(ts, id)
}
