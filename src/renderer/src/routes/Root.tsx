import { Outlet } from '@tanstack/react-router'
import { Layout, Menu, Row } from 'antd'
import { useMemo } from 'react'
import { useRouter, useRouterState } from '@tanstack/react-router'

export default function Root(): React.JSX.Element {
  const router = useRouter()

  const items = useMemo(
    () => [
      { key: 'home', label: '首页' },
      { key: 'library', label: '文件库' },
      { key: 'settings', label: '设置' }
    ],
    []
  )

  const location = useRouterState({ select: (s) => s.location })
  const selectedKey = (() => {
    const current = location.pathname || '/'
    if (current === '/') return 'home'
    if (current.startsWith('/library')) return 'library'
    if (current.startsWith('/settings')) return 'settings'
    return 'home'
  })()

  return (
    <Layout className="h-screen bg-white">
      <Layout.Header className="border-b flex items-center px-0!">
        <Row className="bg-white w-full" justify={'space-between'}>
          <div className="text-black font-semibold mr-6 bg-white px-[5px]">InsightRecorder</div>
          <Menu
            theme="light"
            mode="horizontal"
            selectedKeys={[selectedKey]}
            items={items}
            onClick={(e) => {
              const map: Record<string, string> = {
                home: '/',
                library: '/library',
                settings: '/settings'
              }
              const to = map[e.key]
              if (to) router.navigate({ to })
            }}
            className="flex-1 min-w-0"
          />
        </Row>
      </Layout.Header>
      <Layout.Content>
        <Outlet />
      </Layout.Content>
    </Layout>
  )
}
