import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { index, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(),
  label: text('label'),
  mountpoint: text('mountpoint').notNull(),
  type: text('type').notNull().default('generic'),
  autoSync: integer('autoSync').notNull().default(0),
  deleteSourceAfterSync: integer('deleteSourceAfterSync').notNull().default(0),
  syncRootDir: text('syncRootDir'),
  folderNameRule: text('folderNameRule'),
  folderTemplate: text('folderTemplate'),
  extensions: text('extensions'),
  minSize: integer('minSize'),
  maxSize: integer('maxSize'),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt').notNull(),
  lastSeenAt: integer('lastSeenAt'),
  lastSyncAt: integer('lastSyncAt')
})

export const files = sqliteTable(
  'files',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    deviceId: text('deviceId').notNull(),
    relativePath: text('relativePath').notNull(),
    size: integer('size').notNull(),
    mtimeMs: integer('mtimeMs').notNull(),
    fingerprint: text('fingerprint').notNull(),
    contentHash: text('contentHash'),
    title: text('title')
  },
  (t) => ({
    deviceRelIdx: index('idx_files_device_rel').on(t.deviceId, t.relativePath),
    fingerprintUq: uniqueIndex('u_files_fingerprint').on(t.fingerprint)
  })
)

export const sync_jobs = sqliteTable('sync_jobs', {
  id: text('id').primaryKey(),
  deviceId: text('deviceId').notNull(),
  status: text('status').notNull(),
  startedAt: integer('startedAt').notNull(),
  endedAt: integer('endedAt'),
  copiedCount: integer('copiedCount').notNull().default(0),
  skippedCount: integer('skippedCount').notNull().default(0),
  failedCount: integer('failedCount').notNull().default(0)
})

export const sync_events = sqliteTable('sync_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: text('jobId').notNull(),
  stage: text('stage').notNull(),
  fileId: integer('fileId'),
  ts: integer('ts').notNull(),
  error: text('error')
})
