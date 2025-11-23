import { getDb } from './connection'
import type { DeviceRow } from './types'

export function upsertDevice(row: Partial<DeviceRow> & { id: string; mountpoint: string }): void {
  const db = getDb()
  const now = Date.now()
  const existing = db.prepare('SELECT id FROM devices WHERE id = ?').get(row.id)
  if (existing) {
    db.prepare(
      `UPDATE devices SET label=?, mountpoint=?, type=?, autoSync=?, deleteSourceAfterSync=?, syncRootDir=?, folderNameRule=?, folderTemplate=?, extensions=?, minSize=?, maxSize=?, updatedAt=?, lastSeenAt=? WHERE id=` +
        `?`
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

export function updateDeviceLastSync(id: string, ts: number): void {
  const db = getDb()
  db.prepare('UPDATE devices SET lastSyncAt=? WHERE id=?').run(ts, id)
}

export function listDevices(): DeviceRow[] {
  const db = getDb()
  const rows = db
    .prepare(
      'SELECT id,label,mountpoint,type,autoSync,deleteSourceAfterSync,syncRootDir,folderNameRule,folderTemplate,extensions,minSize,maxSize,createdAt,updatedAt,lastSeenAt,lastSyncAt FROM devices ORDER BY updatedAt DESC'
    )
    .all() as DeviceRow[]
  return rows
}
