import './assets/main.css'
import 'antd/dist/reset.css'
import './styles/tailwind.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import RouterApp from './RouterApp'
import log from 'electron-log/renderer'

window.addEventListener('error', (e) => {
  const err = (e as ErrorEvent).error ?? (e as ErrorEvent).message
  log.error('renderer error', err)
})
window.addEventListener('unhandledrejection', (e) => {
  log.error('renderer unhandledrejection', (e as PromiseRejectionEvent).reason)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: { colorPrimary: '#1677ff', borderRadius: 6 }
      }}
    >
      <RouterApp />
    </ConfigProvider>
  </StrictMode>
)
