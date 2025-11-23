import { ipcMain } from 'electron'
import { getDb } from '../db/connection'
import { countFilesByDevice } from '../db/stats'
import { countSyncedByDevice } from '../db/stats'
import { getDevice as dbGetDevice } from '../db/devices'

export function registerDeviceStatsIPC(): void {
  ipcMain.handle('device:stats', (_event, id: string) => {
    try {
      getDb()
      const fileCount = countFilesByDevice(id)
      const syncedCount = countSyncedByDevice(id)
      const device = dbGetDevice(id)
      return { fileCount, syncedCount, lastSyncAt: device?.lastSyncAt ?? null }
    } catch {
      return { fileCount: 0, syncedCount: 0, lastSyncAt: null }
    }
  })
}
