import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getSystemTheme: () => 'dark' | 'light'
      onSystemThemeUpdated: (handler: (mode: 'dark' | 'light') => void) => () => void
      getUserThemeMode: () => Promise<'light' | 'dark' | 'system' | undefined>
      setUserThemeMode: (mode: 'light' | 'dark' | 'system') => Promise<boolean>
    }
  }
}
