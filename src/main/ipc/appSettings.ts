import { ipcMain } from 'electron'
import type ElectronStore from 'electron-store'
import type { AppSettings } from '../../renderer/src/config/appSettings.schema'

type AppSettingsStore = Partial<AppSettings>

export function initAppDefaults(store: ElectronStore<AppSettingsStore>): void {
  if (store.get('exportTargetPath') === undefined) store.set('exportTargetPath', '')
  if (store.get('renameTemplate') === undefined)
    store.set('renameTemplate', '{date:YYYYMMDD}-{time:HHmmss}-{title}-{device}')
  if (store.get('extensions') === undefined) store.set('extensions', ['wav', 'mp3', 'm4a'])
  if (store.get('concurrency') === undefined) store.set('concurrency', 1)
  if (store.get('retryCount') === undefined) store.set('retryCount', 0)
  if (store.get('clearAfterExport') === undefined) store.set('clearAfterExport', false)
  if (store.get('autoSyncDefault') === undefined) store.set('autoSyncDefault', true)
  if (store.get('deleteSourceAfterSyncDefault') === undefined)
    store.set('deleteSourceAfterSyncDefault', false)
  if (store.get('folderNameRuleDefault') === undefined)
    store.set('folderNameRuleDefault', 'label-id')
}

export function registerAppSettingsIPC(store: ElectronStore<AppSettingsStore>): void {
  ipcMain.handle('app-settings:get', (_event, key: keyof AppSettingsStore) => {
    return store.get(key as string)
  })

  ipcMain.handle('app-settings:get-all', () => {
    const value = {
      exportTargetPath: (store.get('exportTargetPath') as string | undefined) ?? '',
      renameTemplate:
        (store.get('renameTemplate') as string | undefined) ??
        '{date:YYYYMMDD}-{time:HHmmss}-{title}-{device}',
      extensions: (store.get('extensions') as string[] | undefined) ?? ['wav', 'mp3', 'm4a'],
      concurrency: (store.get('concurrency') as number | undefined) ?? 1,
      retryCount: (store.get('retryCount') as number | undefined) ?? 0,
      clearAfterExport: (store.get('clearAfterExport') as boolean | undefined) ?? false,
      autoSyncDefault: (store.get('autoSyncDefault') as boolean | undefined) ?? true,
      deleteSourceAfterSyncDefault:
        (store.get('deleteSourceAfterSyncDefault') as boolean | undefined) ?? false,
      folderNameRuleDefault:
        (store.get('folderNameRuleDefault') as
          | ('label-id' | 'id-date' | 'label-date' | 'custom')
          | undefined) ?? 'label-id'
    }
    return value
  })

  ipcMain.handle('app-settings:update', (_event, partial: Partial<AppSettingsStore>) => {
    const keys = Object.keys(partial) as Array<keyof AppSettingsStore>
    for (const k of keys) {
      const v = partial[k]
      if (v === undefined) continue
      if (k === 'exportTargetPath' || k === 'renameTemplate') {
        if (typeof v === 'string') store.set(k as string, v)
        continue
      }
      if (k === 'extensions') {
        if (Array.isArray(v) && (v as unknown[]).every((x) => typeof x === 'string'))
          store.set(k as string, v)
        continue
      }
      if (k === 'concurrency') {
        if (typeof v === 'number' && Number.isInteger(v) && (v as number) >= 1)
          store.set(k as string, v)
        continue
      }
      if (k === 'retryCount') {
        if (typeof v === 'number' && Number.isInteger(v) && (v as number) >= 0)
          store.set(k as string, v)
        continue
      }
      if (k === 'clearAfterExport') {
        if (typeof v === 'boolean') store.set(k as string, v)
        continue
      }
      if (k === 'autoSyncDefault' || k === 'deleteSourceAfterSyncDefault') {
        if (typeof v === 'boolean') store.set(k as string, v)
        continue
      }
      if (k === 'folderNameRuleDefault') {
        const allowed = new Set(['label-id', 'id-date', 'label-date', 'custom'])
        if (typeof v === 'string' && allowed.has(v as string)) store.set(k as string, v)
        continue
      }
    }
    return true
  })
}
