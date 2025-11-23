export interface DeviceRow {
  id: string
  label?: string
  mountpoint: string
  type: 'recorder' | 'generic' | 'ignored'
  autoSync: number
  deleteSourceAfterSync: number
  syncRootDir?: string
  folderNameRule?: string
  folderTemplate?: string
  extensions?: string
  minSize?: number
  maxSize?: number
  createdAt: number
  updatedAt: number
  lastSeenAt?: number
  lastSyncAt?: number
}

export interface FileRow {
  id?: number
  deviceId: string
  relativePath: string
  size: number
  mtimeMs: number
  fingerprint: string
  contentHash?: string
  title?: string
}

export interface SyncJobRow {
  id: string
  deviceId: string
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
  startedAt: number
  endedAt?: number
  copiedCount: number
  skippedCount: number
  failedCount: number
}

export interface SyncEventRow {
  id?: number
  jobId: string
  stage: 'copied' | 'skip' | 'failed'
  fileId?: number
  ts: number
  error?: string
}
