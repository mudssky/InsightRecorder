import { ipcRenderer } from 'electron'

export type Device = {
  id: string
  label?: string
  mountpoint: string
  capacityTotal?: number
  capacityFree?: number
  lastSeenAt: number
}

export type DeviceChangePayload = { action: 'added' | 'removed'; ts: number }

export const listDevices = async (): Promise<Device[]> => {
  return ipcRenderer.invoke('device:list')
}

export const listPersistedDevices = async (): Promise<Device[]> => {
  return ipcRenderer.invoke('devices:persisted:list')
}

export const onDeviceChanged = (handler: (payload: DeviceChangePayload) => void): (() => void) => {
  const listener = (_e: Electron.IpcRendererEvent, payload: DeviceChangePayload): void =>
    handler(payload)
  ipcRenderer.on('device:changed', listener)
  return () => ipcRenderer.off('device:changed', listener)
}

export type DeviceSettings = {
  id: string
  label?: string
  mountpoint: string
  type: 'recorder' | 'generic' | 'ignored'
  autoSync: boolean
  deleteSourceAfterSync: boolean
  syncRootDir?: string
  folderNameRule?: string
  folderTemplate?: string
  extensions?: string[]
  minSize?: number
  maxSize?: number
  lastSyncAt?: number | null
}

export type DeviceStats = {
  fileCount: number
  syncedCount: number
  lastSyncAt: number | null
}

export const getDeviceSettings = async (id: string): Promise<DeviceSettings | null> => {
  const row = (await ipcRenderer.invoke('device-settings:get', id)) as
    | (Omit<DeviceSettings, 'autoSync' | 'deleteSourceAfterSync' | 'extensions'> & {
        autoSync: number
        deleteSourceAfterSync: number
        extensions?: string | null
      })
    | null
  if (!row) return null
  let exts: string[] | undefined
  if (row.extensions) {
    try {
      const parsed = JSON.parse(row.extensions)
      if (Array.isArray(parsed)) exts = parsed as string[]
    } catch {
      void 0
    }
  }
  return {
    id: row.id,
    label: row.label,
    mountpoint: row.mountpoint,
    type: row.type as DeviceSettings['type'],
    autoSync: !!row.autoSync,
    deleteSourceAfterSync: !!row.deleteSourceAfterSync,
    syncRootDir: row.syncRootDir ?? undefined,
    folderNameRule: row.folderNameRule ?? undefined,
    folderTemplate: row.folderTemplate ?? undefined,
    extensions: exts,
    minSize: row.minSize ?? undefined,
    maxSize: row.maxSize ?? undefined,
    lastSyncAt: row.lastSyncAt ?? null
  }
}

export const updateDeviceSettings = async (
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
): Promise<boolean> => {
  return ipcRenderer.invoke('device-settings:update', id, partial)
}

export const getDeviceStats = async (id: string): Promise<DeviceStats> => {
  return ipcRenderer.invoke('device:stats', id)
}
