import { contextBridge, nativeTheme, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getSystemTheme: (): 'dark' | 'light' => (nativeTheme.shouldUseDarkColors ? 'dark' : 'light'),
  onSystemThemeUpdated: (handler: (mode: 'dark' | 'light') => void): (() => void) => {
    const listener: () => void = () => handler(nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
    nativeTheme.on('updated', listener)
    return () => nativeTheme.off('updated', listener)
  },
  getUserThemeMode: async (): Promise<'light' | 'dark' | 'system' | undefined> => {
    return ipcRenderer.invoke('settings:get', 'themeMode')
  },
  setUserThemeMode: async (mode: 'light' | 'dark' | 'system'): Promise<boolean> => {
    return ipcRenderer.invoke('settings:set', 'themeMode', mode)
  },
  getAppSetting: async <
    K extends
      | 'exportTargetPath'
      | 'renameTemplate'
      | 'extensions'
      | 'concurrency'
      | 'retryCount'
      | 'clearAfterExport'
  >(
    key: K
  ): Promise<
    K extends 'exportTargetPath'
      ? string | undefined
      : K extends 'renameTemplate'
        ? string | undefined
        : K extends 'extensions'
          ? string[] | undefined
          : K extends 'concurrency' | 'retryCount'
            ? number | undefined
            : boolean | undefined
  > => {
    return ipcRenderer.invoke('app-settings:get', key)
  },
  updateAppSettings: async (
    partial: Partial<{
      exportTargetPath: string
      renameTemplate: string
      extensions: string[]
      concurrency: number
      retryCount: number
      clearAfterExport: boolean
    }>
  ): Promise<boolean> => {
    return ipcRenderer.invoke('app-settings:update', partial)
  },
  listDevices: async (): Promise<
    Array<{
      id: string
      label?: string
      mountpoint: string
      capacityTotal?: number
      capacityFree?: number
      lastSeenAt: number
    }>
  > => {
    return ipcRenderer.invoke('device:list')
  },
  startExport: async (payload: { deviceIds: string[] }): Promise<{ taskId: string }> => {
    return ipcRenderer.invoke('export:start', payload)
  },
  getExportSummary: async (
    limit: number
  ): Promise<
    Array<{
      id: string
      startedAt: number
      endedAt?: number
      status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
      total?: number
      success?: number
      failed?: number
      error?: string
      deviceIds?: string[]
    }>
  > => {
    return ipcRenderer.invoke('export:summary', limit)
  },
  onExportProgress: (
    handler: (payload: {
      taskId: string
      stage: 'skip' | 'copied' | 'failed'
      currentFile: string
      successCount: number
      failCount: number
      total: number
      error?: string
    }) => void
  ): (() => void) => {
    const listener = (
      _e: Electron.IpcRendererEvent,
      payload: {
        taskId: string
        stage: 'skip' | 'copied' | 'failed'
        currentFile: string
        successCount: number
        failCount: number
        total: number
        error?: string
      }
    ): void => handler(payload)
    ipcRenderer.on('export:progress', listener)
    return () => ipcRenderer.off('export:progress', listener)
  },
  cancelExport: async (taskId: string): Promise<boolean> => {
    return ipcRenderer.invoke('export:cancel', taskId)
  },
  onDeviceChanged: (
    handler: (payload: { action: 'added' | 'removed'; ts: number }) => void
  ): (() => void) => {
    const listener = (
      _e: Electron.IpcRendererEvent,
      payload: { action: 'added' | 'removed'; ts: number }
    ): void => handler(payload)
    ipcRenderer.on('device:changed', listener)
    return () => ipcRenderer.off('device:changed', listener)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
