import { ipcMain } from 'electron'
import log from 'electron-log'
import { getDb } from '../db/connection'
import {
  getDevice as dbGetDevice,
  upsertDevice,
  updateDevice as dbUpdateDevice
} from '../db/devices'

export function registerDeviceSettingsIPC(): void {
  ipcMain.handle('device-settings:get', (_event, id: string) => {
    try {
      getDb()
      const d = dbGetDevice(id)
      return d ?? null
    } catch (e) {
      log.error('device-settings:get error', e)
      return null
    }
  })

  ipcMain.handle(
    'device-settings:update',
    (
      _event,
      id: string,
      partial: Partial<{
        label?: string
        type?: 'recorder' | 'generic' | 'ignored'
        autoSync?: boolean
        deleteSourceAfterSync?: boolean
        syncRootDir?: string
        folderNameRule?: string
        folderTemplate?: string
        extensions?: string[]
        minSize?: number
        maxSize?: number
      }> & { mountpoint?: string }
    ) => {
      try {
        getDb()
        const existed = dbGetDevice(id)
        if (!existed) {
          upsertDevice({ id, label: partial.label, mountpoint: partial.mountpoint ?? `${id}:\\` })
        }
        const mountpoint = partial.mountpoint ?? existed?.mountpoint ?? `${id}:\\`
        const typeVal = partial.type ?? existed?.type ?? 'generic'
        const autoSyncVal =
          typeof partial.autoSync === 'boolean'
            ? partial.autoSync
              ? 1
              : 0
            : (existed?.autoSync ?? 0)
        const deleteAfterVal =
          typeof partial.deleteSourceAfterSync === 'boolean'
            ? partial.deleteSourceAfterSync
              ? 1
              : 0
            : (existed?.deleteSourceAfterSync ?? 0)
        const syncRootDirVal = partial.syncRootDir ?? existed?.syncRootDir
        const folderNameRuleVal = partial.folderNameRule ?? existed?.folderNameRule
        const folderTemplateVal = partial.folderTemplate ?? existed?.folderTemplate
        const extensionsVal = Array.isArray(partial.extensions)
          ? JSON.stringify(partial.extensions)
          : existed?.extensions
        const minSizeVal = typeof partial.minSize === 'number' ? partial.minSize : existed?.minSize
        const maxSizeVal = typeof partial.maxSize === 'number' ? partial.maxSize : existed?.maxSize
        dbUpdateDevice(id, {
          label: partial.label ?? existed?.label,
          mountpoint,
          type: typeVal,
          autoSync: autoSyncVal,
          deleteSourceAfterSync: deleteAfterVal,
          syncRootDir: syncRootDirVal,
          folderNameRule: folderNameRuleVal,
          folderTemplate: folderTemplateVal,
          extensions: extensionsVal,
          minSize: minSizeVal,
          maxSize: maxSizeVal
        })
        return true
      } catch (e) {
        log.error('device-settings:update error', e)
        return false
      }
    }
  )
}
