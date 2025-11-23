import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Modal,
  Progress,
  Row,
  Space,
  Typography,
  message,
  Radio,
  Select,
  Input,
  Switch
} from 'antd'
import { useRouter } from '@tanstack/react-router'

interface DeviceInfo {
  id: string
  label?: string
  mountpoint: string
  capacityTotal?: number
  capacityFree?: number
  lastSeenAt: number
  type?: 'recorder' | 'generic' | 'ignored'
}

export default function Devices(): React.JSX.Element {
  const router = useRouter()
  const [persisted, setPersisted] = useState<DeviceInfo[]>([])
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [statsMap, setStatsMap] = useState<
    Record<string, { fileCount: number; syncedCount: number }>
  >({})
  const [autoSyncTriggered, setAutoSyncTriggered] = useState<Set<string>>(new Set())
  const [insertModal, setInsertModal] = useState<{ open: boolean; deviceId?: string }>({
    open: false
  })
  const [insertType, setInsertType] = useState<'recorder' | 'generic' | 'ignored'>('recorder')
  const [insertAutoSync, setInsertAutoSync] = useState<boolean>(true)
  const [showDisconnected, setShowDisconnected] = useState<boolean>(true)
  const [typeFilter, setTypeFilter] = useState<'recorder' | 'generic' | 'ignored' | 'all'>('all')
  const [query, setQuery] = useState<string>('')

  const displayDevices = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = persisted.filter((d) => {
      const connected = connectedIds.has(d.id)
      if (!showDisconnected && !connected) return false
      if (typeFilter !== 'all' && d.type && d.type !== typeFilter) return false
      if (q) {
        const hit =
          (d.label ?? '').toLowerCase().includes(q) ||
          d.mountpoint.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q)
        if (!hit) return false
      }
      return true
    })
    return filtered
      .map((d) => ({ ...d, connected: connectedIds.has(d.id) }))
      .sort((a, b) => (a.connected === b.connected ? 0 : a.connected ? -1 : 1))
  }, [persisted, connectedIds, showDisconnected, typeFilter, query])

  const refresh = async (): Promise<void> => {
    setLoading(true)
    try {
      if (!('api' in window) || typeof window.api?.listDevices !== 'function') {
        message.error(
          '设备列表接口不可用：可能是预加载脚本未正确注入或上下文隔离配置异常。请重启应用，或检查 webPreferences.preload/contextIsolation 设置。'
        )
        return
      }
      const connected = await window.api.listDevices()
      const connectedSet = new Set(connected.map((d) => d.id))
      setConnectedIds(connectedSet)
      const all =
        typeof window.api.listPersistedDevices === 'function'
          ? await window.api.listPersistedDevices()
          : connected
      setPersisted(all)
      const statsEntries = await Promise.all(
        all.map(async (d) => {
          try {
            const st = await window.api.getDeviceStats(d.id)
            return [d.id, { fileCount: st.fileCount, syncedCount: st.syncedCount }] as const
          } catch {
            return [d.id, { fileCount: 0, syncedCount: 0 }] as const
          }
        })
      )
      setStatsMap(Object.fromEntries(statsEntries))
    } catch (e) {
      message.error(`获取设备列表失败：${String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    const off = window.api?.onDeviceChanged?.((payload) => {
      void (async () => {
        await refresh()
        const connected = await window.api.listDevices()
        for (const d of connected) {
          try {
            const s = await window.api.getDeviceSettings(d.id)
            if (s?.type === 'recorder' && s.autoSync && !autoSyncTriggered.has(d.id)) {
              const next = new Set(autoSyncTriggered)
              next.add(d.id)
              setAutoSyncTriggered(next)
              const { taskId } = await window.api.startExport({ deviceIds: [d.id] })
              if (taskId) message.info(`已为设备 ${d.label ?? d.id} 启动自动同步`)
            }
            if (!s && payload.action === 'added') {
              setInsertType('recorder')
              setInsertAutoSync(true)
              setInsertModal({ open: true, deviceId: d.id })
              break
            }
          } catch {
            continue
          }
        }
      })()
    })
    return () => {
      if (typeof off === 'function') off()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-4">
      <Space style={{ marginBottom: 12 }}>
        <Button onClick={refresh} loading={loading}>
          刷新
        </Button>
        <Switch
          checked={showDisconnected}
          onChange={setShowDisconnected}
          checkedChildren="显示未连接"
          unCheckedChildren="隐藏未连接"
        />
        <Select
          value={typeFilter}
          onChange={setTypeFilter}
          style={{ width: 160 }}
          options={[
            { label: '全部类型', value: 'all' },
            { label: '录音笔', value: 'recorder' },
            { label: '通用设备', value: 'generic' },
            { label: '忽略', value: 'ignored' }
          ]}
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索名称/盘符/ID"
          style={{ width: 220 }}
        />
      </Space>
      <Row gutter={[12, 12]}>
        {displayDevices.map((d) => {
          const total = d.capacityTotal ?? 0
          const free = d.capacityFree ?? 0
          const used = total > 0 ? total - free : 0
          const percent = total > 0 ? Math.round((used / total) * 100) : 0
          return (
            <Col key={d.id} span={8}>
              <Card
                hoverable
                title={d.label || '可移动设备'}
                extra={
                  <Space>
                    <Typography.Text type={connectedIds.has(d.id) ? 'success' : 'secondary'}>
                      {connectedIds.has(d.id) ? '已连接' : '未连接'}
                    </Typography.Text>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.navigate({ to: `/devices/${d.id}` })
                      }}
                    >
                      详情
                    </Button>
                  </Space>
                }
              >
                <Space orientation="vertical" style={{ width: '100%' }}>
                  <Typography.Text>挂载点：{d.mountpoint}</Typography.Text>
                  <Progress percent={percent} status="active" />
                  <Typography.Text>文件数：{statsMap[d.id]?.fileCount ?? 0}</Typography.Text>
                  <Typography.Text>已同步：{statsMap[d.id]?.syncedCount ?? 0}</Typography.Text>
                </Space>
              </Card>
            </Col>
          )
        })}
      </Row>
      <Modal
        open={insertModal.open}
        title="新设备配置"
        onCancel={() => setInsertModal({ open: false })}
        onOk={async () => {
          if (!insertModal.deviceId) return
          const ok = await window.api.updateDeviceSettings(insertModal.deviceId, {
            type: insertType,
            autoSync: insertAutoSync
          })
          if (ok && insertType === 'recorder' && insertAutoSync) {
            const { taskId } = await window.api.startExport({ deviceIds: [insertModal.deviceId] })
            if (taskId) message.success('已按配置开始同步')
          }
          setInsertModal({ open: false })
        }}
        destroyOnClose
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Typography.Text>设备类型：</Typography.Text>
          <Radio.Group value={insertType} onChange={(e) => setInsertType(e.target.value)}>
            <Radio value="recorder">录音笔</Radio>
            <Radio value="generic">通用设备</Radio>
            <Radio value="ignored">忽略</Radio>
          </Radio.Group>
          <Typography.Text>自动同步：</Typography.Text>
          <Radio.Group value={insertAutoSync} onChange={(e) => setInsertAutoSync(e.target.value)}>
            <Radio value={true}>开启</Radio>
            <Radio value={false}>关闭</Radio>
          </Radio.Group>
        </Space>
      </Modal>
    </div>
  )
}
