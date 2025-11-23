import { getDb } from './connection'
import type { SyncEventRow } from './types'

export function appendEvents(events: SyncEventRow[]): void {
  const db = getDb()
  const stmt = db.prepare('INSERT INTO sync_events(jobId,stage,fileId,ts,error) VALUES (?,?,?,?,?)')
  const trx = db.transaction((items: SyncEventRow[]) => {
    for (const e of items) stmt.run(e.jobId, e.stage, e.fileId ?? null, e.ts, e.error ?? null)
  })
  trx(events)
}
