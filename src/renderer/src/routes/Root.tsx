import { Outlet } from '@tanstack/react-router'
import { Layout, Menu, Row } from 'antd'
import ThemeToggle from '../components/ThemeToggle'
import { useMemo } from 'react'
import { useTheme } from '../theme/context'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { cn } from '@mudssky/jsutils'

export default function Root(): React.JSX.Element {
  const { isDark } = useTheme()
  const router = useRouter()

  const items = useMemo(
    () => [
      { key: 'home', label: '首页' },
      { key: 'library', label: '文件库' },
      { key: 'devices', label: '设备' },
      { key: 'settings', label: '设置' }
    ],
    []
  )

  const location = useRouterState({ select: (s) => s.location })
  const selectedKey = (() => {
    const current = location.pathname || '/'
    if (current === '/') return 'home'
    if (current.startsWith('/library')) return 'library'
    if (current.startsWith('/devices')) return 'devices'
    if (current.startsWith('/settings')) return 'settings'
    return 'home'
  })()

  return (
    <Layout className="h-screen">
      <Layout.Header className={cn('flex items-center px-0!', !isDark && 'bg-white!')}>
        <Row className="w-full!" justify={'space-between'}>
          <div className="font-semibold mr-6 px-[20px]">InsightRecorder</div>
          <Menu
            theme={isDark ? 'dark' : 'light'}
            mode="horizontal"
            selectedKeys={[selectedKey]}
            items={items}
            onClick={(e) => {
              const map: Record<string, string> = {
                home: '/',
                library: '/library',
                devices: '/devices',
                settings: '/settings'
              }
              const to = map[e.key]
              if (to) router.navigate({ to })
            }}
            className="flex-1 min-w-0"
          />
          <div className="px-[20px]">
            <ThemeToggle variant="button" showLabel={false} size="small" />
          </div>
        </Row>
      </Layout.Header>
      <Layout.Content>
        <Outlet />
      </Layout.Content>
    </Layout>
  )
}
