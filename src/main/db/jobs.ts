import { getDb } from './connection'
import type { SyncJobRow } from './types'
import { sync_jobs } from './schema'
import { eq } from 'drizzle-orm'

export function createJob(job: SyncJobRow): void {
  const db = getDb()
  db.insert(sync_jobs)
    .values({
      id: job.id,
      deviceId: job.deviceId,
      status: job.status,
      startedAt: job.startedAt,
      endedAt: job.endedAt ?? null,
      copiedCount: job.copiedCount,
      skippedCount: job.skippedCount,
      failedCount: job.failedCount
    })
    .run()
}

export function updateJob(id: string, partial: Partial<SyncJobRow>): void {
  const db = getDb()
  const existing = db.select().from(sync_jobs).where(eq(sync_jobs.id, id)).get() as
    | SyncJobRow
    | undefined
  if (!existing) return
  const merged: SyncJobRow = { ...existing, ...partial }
  db.update(sync_jobs)
    .set({
      status: merged.status,
      startedAt: merged.startedAt,
      endedAt: merged.endedAt ?? null,
      copiedCount: merged.copiedCount,
      skippedCount: merged.skippedCount,
      failedCount: merged.failedCount
    })
    .where(eq(sync_jobs.id, id))
    .run()
}
