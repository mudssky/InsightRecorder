import { Button, Input, Segmented, Space, Typography, message } from 'antd'
import { useTheme } from '../theme/context'
import { useEffect, useState } from 'react'

export default function Settings(): React.JSX.Element {
  const { themeMode, setThemeMode } = useTheme()
  const [exportPath, setExportPath] = useState<string>('')

  useEffect(() => {
    void (async () => {
      try {
        const p = (await window.api.getAppSetting('exportTargetPath')) as string
        setExportPath(p || '')
      } catch (e) {
        message.error(String(e))
      }
    })()
  }, [])
  return (
    <div className="p-6">
      <Typography.Title level={3}>设置</Typography.Title>
      <Space orientation="vertical" size={16}>
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
        <div>
          <Typography.Text>同步根目录（全局）</Typography.Text>
          <div className="mt-2">
            <Space>
              <Input
                style={{ width: 420 }}
                value={exportPath}
                onChange={(e) => setExportPath(e.target.value)}
                placeholder="选择/输入默认同步根目录"
              />
              <Button
                onClick={async () => {
                  try {
                    const picked = await window.api.selectDirectory(exportPath)
                    if (picked) {
                      setExportPath(picked)
                      await window.api.updateAppSettings({ exportTargetPath: picked })
                      message.success('已更新全局同步根目录')
                    }
                  } catch (e) {
                    message.error(String(e))
                  }
                }}
              >
                选择目录
              </Button>
              <Button
                type="primary"
                onClick={async () => {
                  try {
                    await window.api.updateAppSettings({ exportTargetPath: exportPath })
                    message.success('已保存全局同步根目录')
                  } catch (e) {
                    message.error(String(e))
                  }
                }}
              >
                保存
              </Button>
            </Space>
            <div className="mt-2">
              <Typography.Text type="secondary">
                设备未设置专属目录时，默认按此全局目录同步；设备详情页可覆盖。
              </Typography.Text>
            </div>
          </div>
        </div>
      </Space>
    </div>
  )
}
