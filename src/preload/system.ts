import { ipcRenderer } from 'electron'

export const openPath = async (p: string): Promise<boolean> => {
  return ipcRenderer.invoke('system:open-path', p)
}

export const selectDirectory = async (startPath?: string): Promise<string | null> => {
  return ipcRenderer.invoke('system:select-directory', startPath)
}
