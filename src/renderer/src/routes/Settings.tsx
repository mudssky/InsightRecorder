import { Segmented, Space, Typography } from 'antd'
import { useTheme } from '../theme/context'

export default function Settings(): React.JSX.Element {
  const { themeMode, setThemeMode } = useTheme()
  return (
    <div className="p-6">
      <Typography.Title level={3}>设置</Typography.Title>
      <Space direction="vertical" size={16}>
        <div>
          <Typography.Text>主题模式</Typography.Text>
          <div className="mt-2">
            <Segmented
              value={themeMode}
              options={[
                { label: '系统', value: 'system' },
                { label: '浅色', value: 'light' },
                { label: '深色', value: 'dark' }
              ]}
              onChange={(v: 'system' | 'light' | 'dark') => setThemeMode(v)}
            />
          </div>
        </div>
      </Space>
    </div>
  )
}
