import { getDb } from './connection'
import type { SyncEventRow } from './types'
import { sync_events } from './schema'

export function appendEvents(events: SyncEventRow[]): void {
  const db = getDb()
  db.insert(sync_events)
    .values(
      events.map((e) => ({
        jobId: e.jobId,
        stage: e.stage,
        fileId: e.fileId ?? null,
        ts: e.ts,
        error: e.error ?? null
      }))
    )
    .run()
}
