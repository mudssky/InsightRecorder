import { getDb } from './connection'
import { files, sync_jobs } from './schema'
import { sql, eq } from 'drizzle-orm'

export function countFilesByDevice(deviceId: string): number {
  const db = getDb()
  const row = db
    .select({ c: sql<number>`count(1)` })
    .from(files)
    .where(eq(files.deviceId, deviceId))
    .get() as { c: number } | undefined
  return row?.c ?? 0
}

export function countSyncedByDevice(deviceId: string): number {
  const db = getDb()
  const row = db
    .select({ c: sql<number>`sum(${sync_jobs.copiedCount})` })
    .from(sync_jobs)
    .where(eq(sync_jobs.deviceId, deviceId))
    .get() as { c: number } | undefined
  return row?.c ?? 0
}
