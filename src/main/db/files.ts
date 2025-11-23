import { getDb } from './connection'
import type { FileRow } from './types'

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
