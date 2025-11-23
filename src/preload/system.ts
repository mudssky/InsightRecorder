import { ipcRenderer } from 'electron'

export const openPath = async (p: string): Promise<boolean> => {
  return ipcRenderer.invoke('system:open-path', p)
}
