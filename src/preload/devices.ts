import { ipcRenderer } from 'electron'

export const listDevices = async (): Promise<
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
}

export const onDeviceChanged = (
  handler: (payload: { action: 'added' | 'removed'; ts: number }) => void
): (() => void) => {
  const listener = (
    _e: Electron.IpcRendererEvent,
    payload: { action: 'added' | 'removed'; ts: number }
  ): void => handler(payload)
  ipcRenderer.on('device:changed', listener)
  return () => ipcRenderer.off('device:changed', listener)
}
