PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  label TEXT,
  mountpoint TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'generic',
  autoSync INTEGER NOT NULL DEFAULT 0,
  deleteSourceAfterSync INTEGER NOT NULL DEFAULT 0,
  syncRootDir TEXT,
  folderNameRule TEXT,
  folderTemplate TEXT,
  extensions TEXT,
  minSize INTEGER,
  maxSize INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  lastSeenAt INTEGER,
  lastSyncAt INTEGER
);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deviceId TEXT NOT NULL,
  relativePath TEXT NOT NULL,
  size INTEGER NOT NULL,
  mtimeMs INTEGER NOT NULL,
  fingerprint TEXT NOT NULL UNIQUE,
  contentHash TEXT,
  title TEXT,
  FOREIGN KEY(deviceId) REFERENCES devices(id)
);

CREATE INDEX IF NOT EXISTS idx_files_device_rel ON files(deviceId, relativePath);

CREATE TABLE IF NOT EXISTS sync_jobs (
  id TEXT PRIMARY KEY,
  deviceId TEXT NOT NULL,
  status TEXT NOT NULL,
  startedAt INTEGER NOT NULL,
  endedAt INTEGER,
  copiedCount INTEGER NOT NULL DEFAULT 0,
  skippedCount INTEGER NOT NULL DEFAULT 0,
  failedCount INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(deviceId) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS sync_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jobId TEXT NOT NULL,
  stage TEXT NOT NULL,
  fileId INTEGER,
  ts INTEGER NOT NULL,
  error TEXT,
  FOREIGN KEY(jobId) REFERENCES sync_jobs(id),
  FOREIGN KEY(fileId) REFERENCES files(id)
);