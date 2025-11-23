import { ipcRenderer } from 'electron'

export type AppSettings = {
  exportTargetPath: string
  renameTemplate: string
  extensions: string[]
  concurrency: number
  retryCount: number
  clearAfterExport: boolean
}

export type AppSettingsPartial = Partial<AppSettings>

export const getAppSetting = async <K extends keyof AppSettingsPartial>(
  key: K
): Promise<AppSettingsPartial[K]> => {
  return ipcRenderer.invoke('app-settings:get', key)
}

export const updateAppSettings = async (partial: AppSettingsPartial): Promise<boolean> => {
  return ipcRenderer.invoke('app-settings:update', partial)
}

export const getAppSettings = async (): Promise<AppSettings> => {
  return ipcRenderer.invoke('app-settings:get-all')
}

export const setAppSettings = async (payload: AppSettings): Promise<boolean> => {
  return ipcRenderer.invoke('app-settings:update', payload)
}
