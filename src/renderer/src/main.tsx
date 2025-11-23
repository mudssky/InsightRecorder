import './assets/main.css'
import 'antd/dist/reset.css'
import './styles/tailwind.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import RouterApp from './RouterApp'
import log from 'electron-log/renderer'
import { ThemeProvider } from './theme/ThemeContext'
import { useTheme } from './theme/context'

window.addEventListener('error', (e) => {
  const err = (e as ErrorEvent).error ?? (e as ErrorEvent).message
  log.error('renderer error', err)
})
window.addEventListener('unhandledrejection', (e) => {
  log.error('renderer unhandledrejection', (e as PromiseRejectionEvent).reason)
})

export function ThemedApp(): React.JSX.Element {
  const { isDark } = useTheme()
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#1677ff', borderRadius: 6 }
      }}
    >
      <RouterApp />
    </ConfigProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </StrictMode>
)
