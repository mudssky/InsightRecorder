import { getDb } from './connection'
import type { FileRow } from './types'
import { files } from './schema'

export function upsertFiles(rows: FileRow[]): void {
  const db = getDb()
  db.transaction((tx) => {
    for (const r of rows) {
      tx.insert(files)
        .values({
          deviceId: r.deviceId,
          relativePath: r.relativePath,
          size: r.size,
          mtimeMs: r.mtimeMs,
          fingerprint: r.fingerprint,
          contentHash: r.contentHash ?? null,
          title: r.title ?? null
        })
        .onConflictDoUpdate({
          target: files.fingerprint,
          set: {
            size: r.size,
            mtimeMs: r.mtimeMs,
            contentHash: r.contentHash ?? null,
            title: r.title ?? null
          }
        })
        .run()
    }
  })
}
