import { BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { promises as fsp } from 'fs'
import type ElectronStore from 'electron-store'
import { getDb, updateDeviceLastSync } from '../db'
import log from 'electron-log'

export type ExportTaskStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
export interface ExportTaskSummary {
  id: string
  startedAt: number
  endedAt?: number
  status: ExportTaskStatus
  total?: number
  success?: number
  failed?: number
  error?: string
  deviceIds?: string[]
}

export function registerExportIPC(
  appSettingsStore: ElectronStore<Record<string, unknown>>,
  exportIndexStore: ElectronStore<Record<string, true>>,
  exportHistoryStore: ElectronStore<{ tasks: ExportTaskSummary[] }>
): void {
  const cancellationFlags = new Map<string, boolean>()

  ipcMain.handle('export:start', async (_event, payload: { deviceIds: string[] }) => {
    const taskId = `${Date.now()}`
    const startedAt = Date.now()
    const summary: ExportTaskSummary = {
      id: taskId,
      startedAt,
      status: 'RUNNING',
      deviceIds: payload.deviceIds,
      total: 0,
      success: 0,
      failed: 0
    }
    const history = (exportHistoryStore.get('tasks') as ExportTaskSummary[] | undefined) ?? []
    exportHistoryStore.set('tasks', [summary, ...history])

    const window = BrowserWindow.getAllWindows()[0]
    const globalExts = (appSettingsStore.get('extensions') as string[] | undefined) ?? [
      'wav',
      'mp3',
      'm4a'
    ]
    const globalTargetBase = (appSettingsStore.get('exportTargetPath') as string | undefined) ?? ''
    const globalFolderTemplate =
      (appSettingsStore.get('renameTemplate') as string | undefined) ?? '{device}'

    if (!globalTargetBase) {
      summary.status = 'FAILED'
      summary.endedAt = Date.now()
      summary.error = '未配置导出目录'
      updateHistory(exportHistoryStore, summary)
      return { taskId }
    }

    cancellationFlags.set(taskId, false)
    await (async () => {
      try {
        for (const deviceId of payload.deviceIds) {
          const mount = await resolveMountpointById(deviceId)
          if (!mount) continue
          let exts = globalExts
          let targetBase = globalTargetBase
          let folderTemplate = globalFolderTemplate
          let minSize: number | undefined
          let maxSize: number | undefined
          let deleteSourceAfterSync =
            (appSettingsStore.get('clearAfterExport') as boolean | undefined) ?? false
          try {
            const { getDevice } = await import('../db/devices')
            const dev = getDevice(deviceId)
            if (dev) {
              if (dev.extensions) {
                try {
                  const parsed = JSON.parse(dev.extensions) as string[]
                  if (Array.isArray(parsed) && parsed.length) exts = parsed
                } catch (e) {
                  log.warn('parse device.extensions error', e)
                }
              }
              if (dev.syncRootDir && dev.syncRootDir.length) targetBase = dev.syncRootDir
              if (dev.folderTemplate && dev.folderTemplate.length)
                folderTemplate = dev.folderTemplate
              if (typeof dev.minSize === 'number') minSize = dev.minSize
              if (typeof dev.maxSize === 'number') maxSize = dev.maxSize
              deleteSourceAfterSync = !!dev.deleteSourceAfterSync
            }
          } catch (e) {
            log.error('load device settings error', e)
          }
          const files = await collectAudioFiles(mount, new Set(exts), minSize, maxSize)
          summary.total = (summary.total ?? 0) + files.length
          for (const file of files) {
            if (cancellationFlags.get(taskId)) {
              summary.status = 'CANCELLED'
              summary.endedAt = Date.now()
              updateHistory(exportHistoryStore, summary)
              return
            }
            try {
              const destDir = await buildTargetDir(targetBase, folderTemplate, deviceId)
              await ensureDir(destDir)
              const base = path.basename(file)
              const finalName = await resolveConflictName(destDir, base)
              const targetPath = path.join(destDir, finalName)
              await fsp.copyFile(file, targetPath)
              const fingerprint = await makeFingerprint(deviceId, file)
              exportIndexStore.set(fingerprint, true)
              summary.success = (summary.success ?? 0) + 1
              window?.webContents.send('export:progress', {
                taskId,
                stage: 'copied',
                currentFile: targetPath,
                successCount: summary.success,
                failCount: summary.failed,
                total: summary.total
              })
              if (deleteSourceAfterSync) {
                try {
                  await fsp.unlink(file)
                } catch (e) {
                  log.warn('unlink source file error', e)
                }
              }
            } catch (err) {
              summary.failed = (summary.failed ?? 0) + 1
              window?.webContents.send('export:progress', {
                taskId,
                stage: 'failed',
                currentFile: file,
                error: String(err),
                successCount: summary.success,
                failCount: summary.failed,
                total: summary.total
              })
            }
          }
          try {
            getDb()
            updateDeviceLastSyncSafe(deviceId, Date.now())
          } catch (e) {
            log.error('update last sync error', e)
          }
        }
        summary.status = summary.failed ? 'FAILED' : 'SUCCESS'
        summary.endedAt = Date.now()
        updateHistory(exportHistoryStore, summary)
      } catch (e) {
        summary.status = 'FAILED'
        summary.endedAt = Date.now()
        summary.error = String(e)
        updateHistory(exportHistoryStore, summary)
      }
    })()

    return { taskId }
  })

  ipcMain.handle('export:summary', (_event, limit: number) => {
    const tasks = (exportHistoryStore.get('tasks') as ExportTaskSummary[] | undefined) ?? []
    return tasks.slice(0, Math.max(0, limit ?? 10))
  })

  ipcMain.handle('export:cancel', (_event, taskId: string) => {
    cancellationFlags.set(taskId, true)
    return true
  })
}

async function resolveMountpointById(id: string): Promise<string | undefined> {
  const letter = id.toUpperCase()
  const mount = `${letter}:\\`
  try {
    await fsp.access(mount)
    return mount
  } catch (e) {
    log.error('resolveMountpointById access error', e)
    return undefined
  }
}

async function collectAudioFiles(
  rootDir: string,
  extSet: Set<string>,
  minSize?: number,
  maxSize?: number
): Promise<string[]> {
  const results: string[] = []
  const stack: string[] = [rootDir]
  while (stack.length) {
    const dir = stack.pop() as string
    let entries: fs.Dirent[]
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true })
    } catch (e) {
      log.warn('readdir error', e)
      continue
    }
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        stack.push(full)
      } else if (e.isFile()) {
        const ext = path.extname(e.name).replace(/^\./, '').toLowerCase()
        if (!extSet.has(ext)) continue
        try {
          const st = await fsp.stat(full)
          if (typeof minSize === 'number' && st.size < minSize) continue
          if (typeof maxSize === 'number' && st.size > maxSize) continue
          results.push(full)
        } catch (e) {
          log.warn('stat file error', e)
        }
      }
    }
  }
  return results
}

async function makeFingerprint(deviceId: string, filePath: string): Promise<string> {
  const st = await fsp.stat(filePath)
  return `${deviceId}|${filePath}|${st.size}|${st.mtimeMs}`
}

async function ensureDir(dirPath: string): Promise<void> {
  await fsp.mkdir(dirPath, { recursive: true })
}

async function buildTargetDir(
  baseDir: string,
  template: string,
  deviceId: string
): Promise<string> {
  const safeDevice = deviceId.replace(/[^a-zA-Z0-9-_]/g, '_')
  let name = template
    .replace(/\{date:YYYYMMDD\}|\{time:HHmmss\}|\{title\}/g, '')
    .replace('{device}', safeDevice)
    .replace(/[<>:"/\\|?*]/g, '_')
  name = name.replace(/\s+/g, ' ').trim()
  name = name.replace(/[-_]{2,}/g, '-')
  name = name.replace(/^(?:[-_\s]+)|(?:[-_\s]+)$/g, '')
  if (!name) name = safeDevice
  return path.join(baseDir, name)
}

async function resolveConflictName(dir: string, basename: string): Promise<string> {
  const ext = path.extname(basename)
  const name = path.basename(basename, ext)
  let candidate = basename
  let i = 1
  while (true) {
    try {
      await fsp.access(path.join(dir, candidate))
      i++
      candidate = `${name} (${i})${ext}`
      if (i > 100) {
        const ts = Date.now()
        candidate = `${name}-${ts}${ext}`
      }
    } catch {
      return candidate
    }
  }
}

function updateHistory(
  exportHistoryStore: ElectronStore<{ tasks: ExportTaskSummary[] }>,
  updated: ExportTaskSummary
): void {
  const tasks = (exportHistoryStore.get('tasks') as ExportTaskSummary[] | undefined) ?? []
  const next = tasks.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
  exportHistoryStore.set('tasks', next)
}

function updateDeviceLastSyncSafe(id: string, ts: number): void {
  try {
    getDb()
    updateDeviceLastSync(id, ts)
  } catch (e) {
    log.error('updateDeviceLastSync error', e)
  }
}
