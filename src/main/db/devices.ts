import { getDb } from './connection'
import type { DeviceRow } from './types'
import { devices } from './schema'
import { eq, desc } from 'drizzle-orm'

export function upsertDevice(row: Partial<DeviceRow> & { id: string; mountpoint: string }): void {
  const db = getDb()
  const now = Date.now()
  db.insert(devices)
    .values({
      id: row.id,
      label: row.label ?? null,
      mountpoint: row.mountpoint,
      type: row.type ?? 'generic',
      autoSync: row.autoSync ? 1 : 0,
      deleteSourceAfterSync: row.deleteSourceAfterSync ? 1 : 0,
      syncRootDir: row.syncRootDir ?? null,
      folderNameRule: row.folderNameRule ?? null,
      folderTemplate: row.folderTemplate ?? null,
      extensions: row.extensions ?? null,
      minSize: row.minSize ?? null,
      maxSize: row.maxSize ?? null,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: row.lastSeenAt ?? now
    })
    .onConflictDoUpdate({
      target: devices.id,
      set: {
        label: row.label ?? null,
        mountpoint: row.mountpoint,
        type: row.type ?? 'generic',
        autoSync: row.autoSync ? 1 : 0,
        deleteSourceAfterSync: row.deleteSourceAfterSync ? 1 : 0,
        syncRootDir: row.syncRootDir ?? null,
        folderNameRule: row.folderNameRule ?? null,
        folderTemplate: row.folderTemplate ?? null,
        extensions: row.extensions ?? null,
        minSize: row.minSize ?? null,
        maxSize: row.maxSize ?? null,
        updatedAt: now,
        lastSeenAt: row.lastSeenAt ?? now
      }
    })
    .run()
}

export function getDevice(id: string): DeviceRow | undefined {
  const db = getDb()
  const row = db.select().from(devices).where(eq(devices.id, id)).get() as DeviceRow | undefined
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
  db.update(devices)
    .set({
      label: merged.label ?? null,
      mountpoint: merged.mountpoint,
      type: merged.type,
      autoSync: merged.autoSync ? 1 : 0,
      deleteSourceAfterSync: merged.deleteSourceAfterSync ? 1 : 0,
      syncRootDir: merged.syncRootDir ?? null,
      folderNameRule: merged.folderNameRule ?? null,
      folderTemplate: merged.folderTemplate ?? null,
      extensions: merged.extensions ?? null,
      minSize: merged.minSize ?? null,
      maxSize: merged.maxSize ?? null,
      updatedAt: merged.updatedAt,
      lastSeenAt: merged.lastSeenAt ?? null,
      lastSyncAt: merged.lastSyncAt ?? null
    })
    .where(eq(devices.id, id))
    .run()
}

export function updateDeviceLastSync(id: string, ts: number): void {
  const db = getDb()
  db.update(devices).set({ lastSyncAt: ts }).where(eq(devices.id, id)).run()
}

export function listDevices(): DeviceRow[] {
  const db = getDb()
  const rows = db.select().from(devices).orderBy(desc(devices.updatedAt)).all() as DeviceRow[]
  return rows
}
