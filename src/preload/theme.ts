import { nativeTheme, ipcRenderer } from 'electron'

export type ThemeMode = 'dark' | 'light'
export type ThemeUserMode = 'light' | 'dark' | 'system'

export const getSystemTheme = (): ThemeMode => {
  try {
    const v = (nativeTheme as unknown as { shouldUseDarkColors?: boolean })?.shouldUseDarkColors
    return v ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export const onSystemThemeUpdated = (handler: (mode: ThemeMode) => void): (() => void) => {
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

export const getUserThemeMode = async (): Promise<ThemeUserMode | undefined> => {
  return ipcRenderer.invoke('settings:get', 'themeMode')
}

export const setUserThemeMode = async (mode: ThemeUserMode): Promise<boolean> => {
  return ipcRenderer.invoke('settings:set', 'themeMode', mode)
}
