import { ipcMain } from 'electron'
import type { DiskSpace } from 'check-disk-space'
import checkDiskSpace from 'check-disk-space'
import drivelist from 'drivelist'
import log from 'electron-log'
import { getDb, upsertDevice } from '../db'

export function registerDeviceListIPC(): void {
  ipcMain.handle('device:list', async () => {
    const drives = (await drivelist.list()) as Array<{
      description?: string
      mountpoints?: Array<{ path: string }>
      isUSB?: boolean
      isRemovable?: boolean
      isSystem?: boolean
    }>
    const devices: Array<{
      id: string
      label?: string
      mountpoint: string
      capacityTotal?: number
      capacityFree?: number
      lastSeenAt: number
    }> = []
    for (const d of drives) {
      if (d.isSystem) continue
      if (!(d.isUSB || d.isRemovable)) continue
      const mps = d.mountpoints ?? []
      for (const mp of mps) {
        const mount = mp.path
        let space: DiskSpace | undefined
        try {
          space = await checkDiskSpace(mount)
        } catch (e) {
          log.warn('checkDiskSpace error', e)
        }
        const letter = mount.replace(/:\$/i, '').toUpperCase()
        const device = {
          id: letter,
          label: d.description,
          mountpoint: mount,
          capacityTotal: space?.size,
          capacityFree: space?.free,
          lastSeenAt: Date.now()
        }
        devices.push(device)
        try {
          getDb()
          upsertDevice({
            id: device.id,
            label: device.label,
            mountpoint: device.mountpoint,
            lastSeenAt: device.lastSeenAt
          })
        } catch {
          void 0
        }
      }
    }
    return devices
  })
}
