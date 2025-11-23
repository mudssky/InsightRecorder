import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Typography,
  message
} from 'antd'
import { useRouter, useParams } from '@tanstack/react-router'

const EXT_OPTIONS = ['wav', 'mp3', 'm4a', 'flac', 'aac']
const RULE_OPTIONS = [
  { label: '设备名-设备ID', value: 'label-id' },
  { label: '设备ID/日期', value: 'id-date' },
  { label: '设备名/日期', value: 'label-date' },
  { label: '自定义模板', value: 'custom' }
]

export default function DeviceDetail(): React.JSX.Element {
  const router = useRouter()
  const params = useParams({ from: '/devices/$id' }) as { id: string }
  const id = params.id

  const [settings, setSettings] = useState<DeviceSettings | null>(null)
  const [stats, setStats] = useState<DeviceStats>({
    fileCount: 0,
    syncedCount: 0,
    lastSyncAt: null
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [computedLabel, setComputedLabel] = useState<string | undefined>(undefined)
  const [globalExportPath, setGlobalExportPath] = useState<string>('')

  const [form] = Form.useForm()

  const templatePreview = useMemo(() => {
    const tpl = form.getFieldValue('folderTemplate') as string | undefined
    const rule = form.getFieldValue('folderNameRule') as string | undefined
    const deviceLabel = settings?.label ?? '设备'
    const deviceId = id
    const yyyy = '20250101'
    const hhmmss = '120000'
    const title = '示例文件'
    const base =
      rule === 'label-id'
        ? `${deviceLabel}-${deviceId}`
        : rule === 'id-date'
          ? `${deviceId}/${yyyy}`
          : rule === 'label-date'
            ? `${deviceLabel}/${yyyy}`
            : undefined
    const tplStr = tpl ?? '{date:YYYYMMDD}-{time:HHmmss}-{title}-{device}'
    const name = tplStr
      .replace('{date:YYYYMMDD}', yyyy)
      .replace('{time:HHmmss}', hhmmss)
      .replace('{title}', title)
      .replace('{device}', deviceId)
    return base ? `${base}/${name}.wav` : name + '.wav'
  }, [form, settings, id])

  const refresh = async (): Promise<void> => {
    setLoading(true)
    try {
      const s = await window.api.getDeviceSettings(id)
      setSettings(s)
      let fallbackLabel: string | undefined = s?.label
      if (!fallbackLabel) {
        try {
          const connected = await window.api.listDevices()
          const found = connected.find((d) => d.id === id)
          fallbackLabel = found?.label
          if (!fallbackLabel && typeof window.api.listPersistedDevices === 'function') {
            const persisted = await window.api.listPersistedDevices()
            const pf = persisted.find((d) => d.id === id)
            fallbackLabel = pf?.label
          }
        } catch {
          void 0
        }
      }
      setComputedLabel(fallbackLabel)
      const globalPath = (await window.api.getAppSetting('exportTargetPath')) as string
      setGlobalExportPath(globalPath || '')
      const minSizeMB = s?.minSize ? Math.round(s.minSize / 1024 / 1024) : undefined
      const maxSizeMB = s?.maxSize ? Math.round(s.maxSize / 1024 / 1024) : undefined
      form.setFieldsValue({
        label: fallbackLabel ?? s?.label ?? '',
        type: s?.type ?? 'generic',
        autoSync: s?.autoSync ?? false,
        deleteSourceAfterSync: s?.deleteSourceAfterSync ?? false,
        syncRootDir: s?.syncRootDir && s.syncRootDir.length > 0 ? s.syncRootDir : globalPath || '',
        folderNameRule: s?.folderNameRule ?? 'label-id',
        folderTemplate: s?.folderTemplate ?? '{date:YYYYMMDD}-{time:HHmmss}-{title}-{device}',
        extensions: s?.extensions ?? ['wav', 'mp3', 'm4a', 'aac', 'flac'],
        minSize: minSizeMB,
        maxSize: maxSizeMB
      })
      const st = await window.api.getDeviceStats(id)
      setStats(st)
    } catch (e) {
      message.error(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      const values = await form.validateFields()
      const ok = await window.api.updateDeviceSettings(id, {
        label: values.label,
        type: values.type,
        autoSync: values.autoSync,
        deleteSourceAfterSync: values.deleteSourceAfterSync,
        syncRootDir: values.syncRootDir,
        folderNameRule: values.folderNameRule,
        folderTemplate: values.folderTemplate,
        extensions: values.extensions,
        minSize: values.minSize ? Math.floor(values.minSize * 1024 * 1024) : undefined,
        maxSize: values.maxSize ? Math.floor(values.maxSize * 1024 * 1024) : undefined
      })
      if (ok) message.success('已保存设备设置')
      else message.error('保存失败')
      await refresh()
    } catch (e) {
      message.error(String(e))
    } finally {
      setSaving(false)
    }
  }

  const startSync = async (): Promise<void> => {
    try {
      const { taskId } = await window.api.startExport({ deviceIds: [id] })
      if (taskId) message.success('已启动同步任务')
    } catch (e) {
      message.error(String(e))
    }
  }

  return (
    <div className="p-4">
      <Space style={{ marginBottom: 12 }}>
        <Button onClick={() => router.navigate({ to: '/devices' })}>返回设备列表</Button>
        <Button type="primary" onClick={save} loading={saving}>
          保存设置
        </Button>
        <Button onClick={startSync}>立即同步</Button>
      </Space>
      <Card loading={loading} title={settings?.label ?? computedLabel ?? `设备 ${id}`}>
        <Form
          form={form}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 12 }}
          layout="horizontal"
          initialValues={{
            label: '',
            type: 'generic',
            autoSync: true,
            deleteSourceAfterSync: false,
            syncRootDir: '',
            folderNameRule: 'label-id',
            folderTemplate: '{date:YYYYMMDD}-{time:HHmmss}-{title}-{device}',
            extensions: ['wav', 'mp3', 'm4a'],
            minSize: undefined,
            maxSize: undefined
          }}
        >
          <Form.Item name="label" label="设备名称">
            <Input placeholder="设备标签" />
          </Form.Item>
          <Form.Item name="type" label="设备类型" initialValue="generic">
            <Radio.Group>
              <Radio value="recorder">录音笔</Radio>
              <Radio value="generic">通用设备</Radio>
              <Radio value="ignored">忽略</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="autoSync" label="自动同步">
            <Radio.Group>
              <Radio value={true}>开启</Radio>
              <Radio value={false}>关闭</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="deleteSourceAfterSync" label="同步后删除源文件">
            <Radio.Group>
              <Radio value={false}>保留</Radio>
              <Radio value={true}>删除</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="syncRootDir" label="同步根目录">
            <Space>
              <Input
                style={{ width: 360 }}
                placeholder={
                  globalExportPath
                    ? `选择/输入同步到的根目录（默认：${globalExportPath}）`
                    : '选择/输入同步到的根目录'
                }
              />
              <Button
                onClick={async () => {
                  try {
                    const current = form.getFieldValue('syncRootDir') as string | undefined
                    const picked = await window.api.selectDirectory(current || globalExportPath)
                    if (picked) form.setFieldsValue({ syncRootDir: picked })
                  } catch (e) {
                    message.error(String(e))
                  }
                }}
              >
                选择目录
              </Button>
              <Button
                onClick={() => {
                  form.setFieldsValue({ syncRootDir: globalExportPath })
                }}
              >
                使用全局默认
              </Button>
            </Space>
          </Form.Item>
          <Form.Item name="folderNameRule" label="文件夹命名">
            <Select options={RULE_OPTIONS} />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.folderNameRule !== curr.folderNameRule}
          >
            {() =>
              (form.getFieldValue('folderNameRule') as string) === 'custom' ? (
                <Form.Item name="folderTemplate" label="模板字符串">
                  <Input placeholder="{date:YYYYMMDD}-{time:HHmmss}-{title}-{device}" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item name="extensions" label="文件类型">
            <Select mode="multiple" options={EXT_OPTIONS.map((x) => ({ label: x, value: x }))} />
          </Form.Item>
          <Form.Item name="minSize" label="最小大小(MB)">
            <InputNumber min={0} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="maxSize" label="最大大小(MB)">
            <InputNumber min={0} style={{ width: 200 }} />
          </Form.Item>
        </Form>
        <Space orientation="vertical" style={{ width: '100%', marginTop: 12 }}>
          <Typography.Text>示例路径预览：{templatePreview}</Typography.Text>
          <Typography.Text>设备文件数：{stats.fileCount}</Typography.Text>
          <Typography.Text>已同步数：{stats.syncedCount}</Typography.Text>
          <Typography.Text>
            最近同步：{stats.lastSyncAt ? new Date(stats.lastSyncAt).toLocaleString() : '无'}
          </Typography.Text>
        </Space>
      </Card>
    </div>
  )
}
type DeviceSettings = {
  id: string
  label?: string
  mountpoint: string
  type: 'recorder' | 'generic' | 'ignored'
  autoSync: boolean
  deleteSourceAfterSync: boolean
  syncRootDir?: string
  folderNameRule?: string
  folderTemplate?: string
  extensions?: string[]
  minSize?: number
  maxSize?: number
  lastSyncAt?: number | null
}

type DeviceStats = {
  fileCount: number
  syncedCount: number
  lastSyncAt: number | null
}
