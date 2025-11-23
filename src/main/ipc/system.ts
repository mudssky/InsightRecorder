import { ipcMain, shell, dialog } from 'electron'
import log from 'electron-log'
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
    } catch (e) {
      log.error('system:open-path error', e)
      return false
    }
  })

  ipcMain.handle('system:select-directory', async (_e, startPath?: unknown) => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        defaultPath: typeof startPath === 'string' && startPath.length > 0 ? startPath : undefined
      })
      if (canceled || !filePaths || filePaths.length === 0) return null
      return filePaths[0]
    } catch (e) {
      log.error('system:select-directory error', e)
      return null
    }
  })
}
