import { contextBridge, nativeTheme } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getSystemTheme: (): 'dark' | 'light' => (nativeTheme.shouldUseDarkColors ? 'dark' : 'light'),
  onSystemThemeUpdated: (handler: (mode: 'dark' | 'light') => void): (() => void) => {
    const listener: () => void = () => handler(nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
    nativeTheme.on('updated', listener)
    return () => nativeTheme.off('updated', listener)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
