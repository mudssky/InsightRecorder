import { getDb } from './connection'
import type { SyncJobRow } from './types'

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
