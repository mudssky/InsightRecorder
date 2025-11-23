import { app, shell, BrowserWindow, ipcMain } from 'electron'
import fs from 'fs'
import { promises as fsp } from 'fs'
import path from 'path'
import type { DiskSpace } from 'check-disk-space'
import checkDiskSpace from 'check-disk-space'
import ElectronStore from 'electron-store'
import log from 'electron-log'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import drivelist from 'drivelist'
import usbDetect from 'usb-detection'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => {
    log.info('ipc: ping')
  })

  try {
    usbDetect.startMonitoring()
  } catch (e) {
    log.warn('usb-detection startMonitoring failed', e)
  }
  try {
    usbDetect.on('add', () => {
      const win = BrowserWindow.getAllWindows()[0]
      win?.webContents.send('device:changed', { action: 'added', ts: Date.now() })
    })
    usbDetect.on('remove', () => {
      const win = BrowserWindow.getAllWindows()[0]
      win?.webContents.send('device:changed', { action: 'removed', ts: Date.now() })
    })
  } catch (e) {
    log.warn('usb-detection events bind failed', e)
  }

  interface SettingsSchema extends Record<string, unknown> {
    themeMode?: 'light' | 'dark' | 'system'
    exportTargetPath?: string
    renameTemplate?: string
    extensions?: string[]
    concurrency?: number
    retryCount?: number
    clearAfterExport?: boolean
  }
  type ElectronStoreConstructor<T extends Record<string, unknown>> = new (
    options?: unknown
  ) => ElectronStore<T>
  const maybeDefault = ElectronStore as unknown as {
    default?: ElectronStoreConstructor<SettingsSchema>
  }
  const StoreCtor: ElectronStoreConstructor<SettingsSchema> =
    maybeDefault.default ?? (ElectronStore as unknown as ElectronStoreConstructor<SettingsSchema>)
  const settingsStore = new StoreCtor({ name: 'settings' })
  const appSettingsStore = new StoreCtor({ name: 'app-settings' })
  const exportIndexStore = new StoreCtor({ name: 'export-index' }) as unknown as ElectronStore<
    Record<string, true>
  >
  const exportHistoryStore = new StoreCtor({ name: 'export-history' }) as unknown as ElectronStore<{
    tasks: ExportTaskSummary[]
  }>

  type ExportTaskStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  interface ExportTaskSummary {
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

  const cancellationFlags = new Map<string, boolean>()

  // 初始化默认应用设置
  if (appSettingsStore.get('exportTargetPath') === undefined) {
    appSettingsStore.set('exportTargetPath', '')
  }
  if (appSettingsStore.get('renameTemplate') === undefined) {
    appSettingsStore.set('renameTemplate', '{date:YYYYMMDD}-{time:HHmmss}-{title}-{device}')
  }
  if (appSettingsStore.get('extensions') === undefined) {
    appSettingsStore.set('extensions', ['wav', 'mp3', 'm4a'])
  }
  if (appSettingsStore.get('concurrency') === undefined) {
    appSettingsStore.set('concurrency', 1)
  }
  if (appSettingsStore.get('retryCount') === undefined) {
    appSettingsStore.set('retryCount', 0)
  }
  if (appSettingsStore.get('clearAfterExport') === undefined) {
    appSettingsStore.set('clearAfterExport', false)
  }

  ipcMain.handle('settings:get', (_event, key: 'themeMode') => {
    return settingsStore.get(key)
  })

  ipcMain.handle('settings:set', (_event, key: 'themeMode', value: 'light' | 'dark' | 'system') => {
    settingsStore.set(key, value)
    return true
  })

  // AppSettings IPC
  ipcMain.handle(
    'app-settings:get',
    (
      _event,
      key:
        | 'exportTargetPath'
        | 'renameTemplate'
        | 'extensions'
        | 'concurrency'
        | 'retryCount'
        | 'clearAfterExport'
    ) => {
      return appSettingsStore.get(key)
    }
  )

  ipcMain.handle(
    'app-settings:update',
    (
      _event,
      partial: Partial<{
        exportTargetPath: string
        renameTemplate: string
        extensions: string[]
        concurrency: number
        retryCount: number
        clearAfterExport: boolean
      }>
    ) => {
      const keys = Object.keys(partial) as Array<
        | 'exportTargetPath'
        | 'renameTemplate'
        | 'extensions'
        | 'concurrency'
        | 'retryCount'
        | 'clearAfterExport'
      >
      for (const k of keys) {
        const v = partial[k]
        if (v !== undefined) appSettingsStore.set(k, v as unknown)
      }
      return true
    }
  )

  ipcMain.handle('device:list', async () => {
    const drives = (await drivelist.list()) as Array<{
      description?: string
      mountpoints?: Array<{ path: string }>
      isUSB?: boolean
      isRemovable?: boolean
      isSystem?: boolean
    }>
    const devices: Array<{
      id: string
      label?: string
      mountpoint: string
      capacityTotal?: number
      capacityFree?: number
      lastSeenAt: number
    }> = []
    for (const d of drives) {
      if (d.isSystem) continue
      if (!(d.isUSB || d.isRemovable)) continue
      const mps = d.mountpoints ?? []
      for (const mp of mps) {
        const mount = mp.path
        let space: DiskSpace | undefined
        try {
          space = await checkDiskSpace(mount)
        } catch (e) {
          log.warn('checkDiskSpace error', e)
        }
        const letter = mount.replace(/:\\$/i, '').toUpperCase()
        devices.push({
          id: letter,
          label: d.description,
          mountpoint: mount,
          capacityTotal: space?.size,
          capacityFree: space?.free,
          lastSeenAt: Date.now()
        })
      }
    }
    return devices
  })

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
    const exts = (appSettingsStore.get('extensions') as string[] | undefined) ?? [
      'wav',
      'mp3',
      'm4a'
    ]
    const targetBase = (appSettingsStore.get('exportTargetPath') as string | undefined) ?? ''
    const renameTemplate =
      (appSettingsStore.get('renameTemplate') as string | undefined) ??
      '{date:YYYYMMDD}-{time:HHmmss}-{title}-{device}'

    if (!targetBase) {
      summary.status = 'FAILED'
      summary.endedAt = Date.now()
      summary.error = '未配置导出目录'
      updateHistory(summary)
      return { taskId }
    }

    cancellationFlags.set(taskId, false)
    ;(async () => {
      try {
        for (const deviceId of payload.deviceIds) {
          const mount = await resolveMountpointById(deviceId)
          if (!mount) continue
          const files = await collectAudioFiles(mount, new Set(exts))
          summary.total = (summary.total ?? 0) + files.length
          for (const file of files) {
            if (cancellationFlags.get(taskId)) {
              summary.status = 'CANCELLED'
              summary.endedAt = Date.now()
              updateHistory(summary)
              return
            }
            const fingerprint = await makeFingerprint(deviceId, file)
            const already = exportIndexStore.get(fingerprint)
            if (already) {
              window?.webContents.send('export:progress', {
                taskId,
                stage: 'skip',
                currentFile: file,
                successCount: summary.success,
                failCount: summary.failed,
                total: summary.total
              })
              continue
            }
            try {
              const targetPath = await buildTargetPath(
                targetBase,
                renameTemplate,
                deviceId,
                mount,
                file
              )
              await ensureDir(path.dirname(targetPath))
              await fsp.copyFile(file, targetPath)
              exportIndexStore.set(fingerprint, true)
              summary.success = (summary.success ?? 0) + 1
              window?.webContents.send('export:progress', {
                taskId,
                stage: 'copied',
                currentFile: file,
                successCount: summary.success,
                failCount: summary.failed,
                total: summary.total
              })
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
        }
        summary.status = summary.failed ? 'FAILED' : 'SUCCESS'
        summary.endedAt = Date.now()
        updateHistory(summary)
      } catch (e) {
        summary.status = 'FAILED'
        summary.endedAt = Date.now()
        summary.error = String(e)
        updateHistory(summary)
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

  async function resolveMountpointById(id: string): Promise<string | undefined> {
    const letter = id.toUpperCase()
    const mount = `${letter}:\\`
    try {
      await fsp.access(mount)
      return mount
    } catch {
      return undefined
    }
  }

  async function collectAudioFiles(rootDir: string, extSet: Set<string>): Promise<string[]> {
    const results: string[] = []
    const stack: string[] = [rootDir]
    while (stack.length) {
      const dir = stack.pop() as string
      let entries: fs.Dirent[]
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true })
      } catch {
        continue
      }
      for (const e of entries) {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) {
          stack.push(full)
        } else if (e.isFile()) {
          const ext = path.extname(e.name).replace(/^\./, '').toLowerCase()
          if (extSet.has(ext)) results.push(full)
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

  async function buildTargetPath(
    baseDir: string,
    template: string,
    deviceId: string,
    mount: string,
    srcFile: string
  ): Promise<string> {
    const st = await fsp.stat(srcFile)
    const date = new Date(st.mtimeMs)
    const pad = (n: number): string => String(n).padStart(2, '0')
    const yyyy = date.getFullYear()
    const mm = pad(date.getMonth() + 1)
    const dd = pad(date.getDate())
    const hh = pad(date.getHours())
    const mi = pad(date.getMinutes())
    const ss = pad(date.getSeconds())
    const title = path.basename(srcFile, path.extname(srcFile))
    const rel = path.relative(mount, srcFile)
    const safeDevice = deviceId.replace(/[^a-zA-Z0-9-_]/g, '_')
    const name = template
      .replace('{date:YYYYMMDD}', `${yyyy}${mm}${dd}`)
      .replace('{time:HHmmss}', `${hh}${mi}${ss}`)
      .replace('{title}', title)
      .replace('{device}', safeDevice)
    const subdir = path.dirname(rel)
    return path.join(baseDir, safeDevice, subdir, `${name}${path.extname(srcFile)}`)
  }

  function updateHistory(updated: ExportTaskSummary): void {
    const tasks = (exportHistoryStore.get('tasks') as ExportTaskSummary[] | undefined) ?? []
    const next = tasks.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
    exportHistoryStore.set('tasks', next)
  }

  // 捕获未处理异常并写入日志
  process.on('uncaughtException', (error) => {
    log.error('uncaughtException', error)
  })
  process.on('unhandledRejection', (reason) => {
    log.error('unhandledRejection', reason as unknown)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
  app.on('will-quit', () => {
    try {
      usbDetect.stopMonitoring()
    } catch (e) {
      log.warn('usb-detection stopMonitoring failed', e)
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
