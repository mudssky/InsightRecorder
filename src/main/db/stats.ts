import { getDb } from './connection'

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
