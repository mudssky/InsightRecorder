import { nativeTheme, ipcRenderer } from 'electron'

export const getSystemTheme = (): 'dark' | 'light' => {
  try {
    const v = (nativeTheme as unknown as { shouldUseDarkColors?: boolean })?.shouldUseDarkColors
    return v ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export const onSystemThemeUpdated = (handler: (mode: 'dark' | 'light') => void): (() => void) => {
  const listener: () => void = () => {
    try {
      const v = (nativeTheme as unknown as { shouldUseDarkColors?: boolean })?.shouldUseDarkColors
      handler(v ? 'dark' : 'light')
    } catch {
      handler('light')
    }
  }
  try {
    nativeTheme.on('updated', listener)
    return () => nativeTheme.off('updated', listener)
  } catch {
    return () => {}
  }
}

export const getUserThemeMode = async (): Promise<'light' | 'dark' | 'system' | undefined> => {
  return ipcRenderer.invoke('settings:get', 'themeMode')
}

export const setUserThemeMode = async (mode: 'light' | 'dark' | 'system'): Promise<boolean> => {
  return ipcRenderer.invoke('settings:set', 'themeMode', mode)
}
