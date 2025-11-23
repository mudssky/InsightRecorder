import { useEffect, useMemo, useRef, useState } from 'react'
import { ThemeContext, ThemeMode } from './context'

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')
  const [systemMode, setSystemMode] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.api?.getSystemTheme) {
      return window.api.getSystemTheme()
    }
    return 'light'
  })
  const unsubRef = useRef<null | (() => void)>(null)

  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true
    if (themeMode === 'light') return false
    return systemMode === 'dark'
  }, [themeMode, systemMode])

  useEffect(() => {
    window.api?.setUserThemeMode(themeMode).catch(() => {})
  }, [themeMode])

  useEffect(() => {
    // initial load from persisted settings
    window.api?.getUserThemeMode().then((m) => {
      if (m === 'light' || m === 'dark' || m === 'system') setThemeMode(m)
    })

    const root = document.documentElement
    if (isDark) root.classList.add('dark')
    else root.classList.remove('dark')
  }, [isDark])

  useEffect(() => {
    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }
    if (window.api?.onSystemThemeUpdated) {
      unsubRef.current = window.api.onSystemThemeUpdated((m) => setSystemMode(m))
    }
    return () => {
      if (unsubRef.current) unsubRef.current()
      unsubRef.current = null
    }
  }, [])

  const value = { themeMode, isDark, setThemeMode }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
