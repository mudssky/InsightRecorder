import { ipcRenderer } from 'electron'
import type { AppSettings } from '../renderer/src/config/appSettings.schema'

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
