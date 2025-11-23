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

export const onDeviceChanged = (handler: (payload: DeviceChangePayload) => void): (() => void) => {
  const listener = (_e: Electron.IpcRendererEvent, payload: DeviceChangePayload): void =>
    handler(payload)
  ipcRenderer.on('device:changed', listener)
  return () => ipcRenderer.off('device:changed', listener)
}
