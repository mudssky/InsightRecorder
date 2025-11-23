import { Button, Input, Row, Segmented, Space, Typography, message, Radio, Select } from 'antd'
import { useMemo } from 'react'
import { useTheme } from '../theme/context'
import { useEffect, useState } from 'react'
import type { AppSettings } from '@shared/config/appSettings.schema'

const EXT_OPTIONS = ['wav', 'mp3', 'm4a', 'flac', 'aac']
const RULE_OPTIONS = [
  { label: '设备名-设备ID', value: 'label-id' },
  { label: '自定义模板', value: 'custom' }
]

export default function Settings(): React.JSX.Element {
  const { themeMode, setThemeMode } = useTheme()
  const [exportPath, setExportPath] = useState<string>('')
  const [autoSyncDefault, setAutoSyncDefault] = useState<boolean>(true)
  const [deleteSourceAfterSyncDefault, setDeleteSourceAfterSyncDefault] = useState<boolean>(false)
  const [folderNameRuleDefault, setFolderNameRuleDefault] = useState<
    'label-id' | 'id-date' | 'label-date' | 'custom'
  >('label-id')
  const [renameTemplate, setRenameTemplate] = useState<string>('{date:YYYYMMDD}-{title}-{device}')
  const [extensions, setExtensions] = useState<string[]>(['wav', 'mp3', 'm4a'])

  useEffect(() => {
    void (async () => {
      try {
        const all = (await window.api.getAppSettings()) as AppSettings
        setExportPath(all.exportTargetPath || '')
        setAutoSyncDefault(!!all.autoSyncDefault)
        setDeleteSourceAfterSyncDefault(!!all.deleteSourceAfterSyncDefault)
        setFolderNameRuleDefault(all.folderNameRuleDefault === 'custom' ? 'custom' : 'label-id')
        setRenameTemplate(all.renameTemplate || '{date:YYYYMMDD}-{title}-{device}')
        setExtensions(
          all.extensions && all.extensions.length > 0 ? all.extensions : ['wav', 'mp3', 'm4a']
        )
      } catch (e) {
        message.error(String(e))
      }
    })()
  }, [])
  const templatePreview = useMemo(() => {
    const deviceLabel = '设备'
    const deviceId = 'DEV001'
    const yyyy = '20250101'
    const title = '示例文件'
    const base = folderNameRuleDefault === 'label-id' ? `${deviceLabel}-${deviceId}` : undefined
    const tplStr = renameTemplate || '{date:YYYYMMDD}-{title}-{device}'
    const name = tplStr
      .replace('{date:YYYYMMDD}', yyyy)
      .replace('{title}', title)
      .replace('{device}', deviceId)
    return base ? `${base}/${name}` : name
  }, [folderNameRuleDefault, renameTemplate])
  return (
    <div className="p-6">
      <Typography.Title level={3}>设置</Typography.Title>
      <Row justify={'end'}>
        <Space style={{ marginBottom: 12 }}>
          <Button
            type="primary"
            onClick={async () => {
              try {
                await window.api.updateAppSettings({
                  exportTargetPath: exportPath,
                  autoSyncDefault,
                  deleteSourceAfterSyncDefault,
                  folderNameRuleDefault,
                  renameTemplate,
                  extensions
                })
                message.success('已保存全局配置')
              } catch (e) {
                message.error(String(e))
              }
            }}
          >
            保存配置
          </Button>
        </Space>
      </Row>

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
                      message.success('已更新全局同步根目录（选择后已生效）')
                    }
                  } catch (e) {
                    message.error(String(e))
                  }
                }}
              >
                选择目录
              </Button>
            </Space>
            <div className="mt-2">
              <Typography.Text type="secondary">
                设备未设置专属目录时，默认按此全局目录同步；设备详情页可覆盖。
              </Typography.Text>
            </div>
          </div>
        </div>
        <div>
          <Typography.Text>自动同步（默认）</Typography.Text>
          <div className="mt-2">
            <Radio.Group
              value={autoSyncDefault}
              onChange={(e) => setAutoSyncDefault(e.target.value)}
            >
              <Radio value={true}>开启</Radio>
              <Radio value={false}>关闭</Radio>
            </Radio.Group>
          </div>
        </div>
        <div>
          <Typography.Text>同步后删除源文件（默认）</Typography.Text>
          <div className="mt-2">
            <Radio.Group
              value={deleteSourceAfterSyncDefault}
              onChange={(e) => setDeleteSourceAfterSyncDefault(e.target.value)}
            >
              <Radio value={false}>保留</Radio>
              <Radio value={true}>删除</Radio>
            </Radio.Group>
          </div>
        </div>
        <div>
          <Typography.Text>文件夹命名（默认）</Typography.Text>
          <div className="mt-2">
            <Select
              style={{ width: 420 }}
              value={folderNameRuleDefault}
              options={RULE_OPTIONS}
              onChange={setFolderNameRuleDefault}
            />
          </div>
        </div>
        {folderNameRuleDefault === 'custom' ? (
          <div>
            <Typography.Text>模板字符串（默认）</Typography.Text>
            <div className="mt-2">
              <Input
                style={{ width: 420 }}
                value={renameTemplate}
                onChange={(e) => setRenameTemplate(e.target.value)}
                placeholder="{date:YYYYMMDD}-{title}-{device}"
              />
            </div>
            <div className="mt-2">
              <Typography.Text type="secondary">模板示例：{templatePreview}</Typography.Text>
            </div>
            <div className="mt-2">
              <Typography.Text type="secondary">
                模板仅在“自定义模板”规则下生效；设备详情页可覆盖。
              </Typography.Text>
            </div>
          </div>
        ) : null}
        <div>
          <Typography.Text>文件类型（默认）</Typography.Text>
          <div className="mt-2">
            <Select
              mode="multiple"
              style={{ width: 420 }}
              value={extensions}
              options={EXT_OPTIONS.map((x) => ({ label: x, value: x }))}
              onChange={setExtensions}
            />
          </div>
        </div>
      </Space>
    </div>
  )
}
