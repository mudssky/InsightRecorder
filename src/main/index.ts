import { app, ipcMain, BrowserWindow } from 'electron'
import ElectronStore from 'electron-store'
import log from 'electron-log'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createWindow } from './windows'
import { initUsbMonitoring, stopUsbMonitoring } from './usb'
import { registerSettingsIPC } from './ipc/settings'
import { initAppDefaults, registerAppSettingsIPC } from './ipc/appSettings'
import { registerDeviceListIPC } from './ipc/deviceList'
import { registerExportIPC } from './ipc/export'
import { registerDeviceSettingsIPC } from './ipc/deviceSettings'
import { registerDeviceStatsIPC } from './ipc/deviceStats'
import { registerSystemIPC } from './ipc/system'
import { getDb } from './db'

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

  ipcMain.on('ping', () => {
    log.info('ipc: ping')
  })

  try {
    log.initialize()
  } catch (e) {
    log.warn('log.initialize failed', e)
  }

  getDb()

  initUsbMonitoring()

  type ElectronStoreConstructor<T extends Record<string, unknown>> = new (
    options?: unknown
  ) => ElectronStore<T>
  const maybeDefault = ElectronStore as unknown as {
    default?: ElectronStoreConstructor<Record<string, unknown>>
  }
  const StoreCtor: ElectronStoreConstructor<Record<string, unknown>> =
    maybeDefault.default ??
    (ElectronStore as unknown as ElectronStoreConstructor<Record<string, unknown>>)
  const settingsStore = new StoreCtor({ name: 'settings' }) as ElectronStore<
    Record<string, unknown>
  >
  const appSettingsStore = new StoreCtor({ name: 'app-settings' }) as ElectronStore<
    Record<string, unknown>
  >
  const exportIndexStore = new StoreCtor({ name: 'export-index' }) as unknown as ElectronStore<
    Record<string, true>
  >
  const exportHistoryStore = new StoreCtor({ name: 'export-history' }) as unknown as ElectronStore<{
    tasks: import('./ipc/export').ExportTaskSummary[]
  }>

  initAppDefaults(appSettingsStore as ElectronStore<Record<string, unknown>>)

  registerSettingsIPC(settingsStore as ElectronStore<Record<string, unknown>>)

  registerAppSettingsIPC(appSettingsStore as ElectronStore<Record<string, unknown>>)

  registerDeviceListIPC()

  registerExportIPC(
    appSettingsStore as ElectronStore<Record<string, unknown>>,
    exportIndexStore,
    exportHistoryStore
  )

  registerDeviceSettingsIPC()
  registerDeviceStatsIPC()
  registerSystemIPC()

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
    stopUsbMonitoring()
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
