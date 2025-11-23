import { ipcMain } from 'electron'
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
    } catch {
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
        const extStr = Array.isArray(partial.extensions)
          ? JSON.stringify(partial.extensions)
          : undefined
        dbUpdateDevice(id, {
          label: partial.label,
          mountpoint: partial.mountpoint ?? existed?.mountpoint ?? `${id}:\\`,
          type: partial.type,
          autoSync: partial.autoSync ? 1 : 0,
          deleteSourceAfterSync: partial.deleteSourceAfterSync ? 1 : 0,
          syncRootDir: partial.syncRootDir,
          folderNameRule: partial.folderNameRule,
          folderTemplate: partial.folderTemplate,
          extensions: extStr,
          minSize: partial.minSize,
          maxSize: partial.maxSize
        })
        return true
      } catch {
        return false
      }
    }
  )
}
