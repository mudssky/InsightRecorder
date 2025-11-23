import { ipcMain } from 'electron'
import type { DiskSpace } from 'check-disk-space'
import checkDiskSpaceModule from 'check-disk-space'
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
        const checkDiskSpaceFn =
          (checkDiskSpaceModule as unknown as { default?: (path: string) => Promise<DiskSpace> })
            .default ?? (checkDiskSpaceModule as unknown as (path: string) => Promise<DiskSpace>)
        try {
          space = await checkDiskSpaceFn(mount)
        } catch (e) {
          log.warn('checkDiskSpace error', e)
        }
        const letter = mount.replace(/:\\$/i, '').toUpperCase()
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
  ipcMain.handle('devices:persisted:list', async () => {
    try {
      const { listDevices } = await import('../db/devices')
      const rows = listDevices()
      // 映射到前端使用的数据结构
      return rows.map((r) => ({
        id: r.id,
        label: r.label ?? undefined,
        mountpoint: r.mountpoint,
        type: r.type,
        capacityTotal: undefined,
        capacityFree: undefined,
        lastSeenAt: r.lastSeenAt ?? 0
      }))
    } catch {
      return []
    }
  })
}
