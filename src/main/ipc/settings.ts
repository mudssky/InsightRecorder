import { ipcMain } from 'electron'
import type ElectronStore from 'electron-store'

export type ThemeMode = 'light' | 'dark' | 'system'
export interface SettingsSchema extends Record<string, unknown> {
  themeMode?: ThemeMode
}

export function registerSettingsIPC(settingsStore: ElectronStore<SettingsSchema>): void {
  ipcMain.handle('settings:get', (_event, key: 'themeMode') => {
    return settingsStore.get(key)
  })

  ipcMain.handle('settings:set', (_event, key: 'themeMode', value: ThemeMode) => {
    settingsStore.set(key, value)
    return true
  })
}
