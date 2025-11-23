import { ipcMain, shell } from 'electron'
import fs from 'fs/promises'
import path from 'path'

export const registerSystemIPC = (): void => {
  ipcMain.handle('system:open-path', async (_e, p: unknown) => {
    try {
      if (typeof p !== 'string' || p.length === 0) return false
      const normalized = path.normalize(p)
      const stat = await fs.stat(normalized)
      if (!stat.isDirectory()) return false
      const result = await shell.openPath(normalized)
      return result === ''
    } catch {
      return false
    }
  })
}
