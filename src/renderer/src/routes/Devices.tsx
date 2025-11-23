import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Modal, Progress, Row, Space, Typography, message, Radio } from 'antd'
import { useRouter } from '@tanstack/react-router'

interface DeviceInfo {
  id: string
  label?: string
  mountpoint: string
  capacityTotal?: number
  capacityFree?: number
  lastSeenAt: number
}

interface ProgressPayload {
  taskId: string
  stage: 'skip' | 'copied' | 'failed'
  currentFile: string
  successCount: number
  failCount: number
  total: number
  error?: string
}

export default function Devices(): React.JSX.Element {
  const router = useRouter()
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<{
    taskId?: string
    success: number
    failed: number
    total: number
  }>({ success: 0, failed: 0, total: 0 })
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null)
  const [statsMap, setStatsMap] = useState<
    Record<string, { fileCount: number; syncedCount: number }>
  >({})
  const [autoSyncTriggered, setAutoSyncTriggered] = useState<Set<string>>(new Set())
  const [insertModal, setInsertModal] = useState<{ open: boolean; deviceId?: string }>({
    open: false
  })
  const [insertType, setInsertType] = useState<'recorder' | 'generic' | 'ignored'>('recorder')
  const [insertAutoSync, setInsertAutoSync] = useState<boolean>(true)

  const percent = useMemo(() => {
    const done = progress.success + progress.failed
    return progress.total > 0 ? Math.round((done / progress.total) * 100) : 0
  }, [progress])

  const refresh = async (): Promise<void> => {
    setLoading(true)
    try {
      if (!('api' in window) || typeof window.api?.listDevices !== 'function') {
        message.error(
          '设备列表接口不可用：可能是预加载脚本未正确注入或上下文隔离配置异常。请重启应用，或检查 webPreferences.preload/contextIsolation 设置。'
        )
        return
      }
      const list = await window.api.listDevices()
      setDevices(list)
      const statsEntries = await Promise.all(
        list.map(async (d) => {
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
        for (const d of devices) {
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
      if (unsubscribe) unsubscribe()
      if (typeof off === 'function') off()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startExport = async (): Promise<void> => {
    if (selected.size === 0) {
      message.warning('请先选择设备')
      return
    }
    const deviceIds = Array.from(selected)
    const { taskId } = await window.api.startExport({ deviceIds })
    const un = window.api.onExportProgress((p: ProgressPayload) => {
      if (p.taskId !== taskId) return
      setProgress({ taskId, success: p.successCount, failed: p.failCount, total: p.total })
    })
    setUnsubscribe(() => un)
  }

  const cancel = async (): Promise<void> => {
    if (progress.taskId) {
      await window.api.cancelExport(progress.taskId)
      message.info('已请求取消导出')
    }
  }

  return (
    <div className="p-4">
      <Space style={{ marginBottom: 12 }}>
        <Button onClick={refresh} loading={loading}>
          刷新
        </Button>
        <Button type="primary" onClick={startExport} disabled={selected.size === 0}>
          导出选中
        </Button>
        <Button danger onClick={cancel} disabled={!progress.taskId}>
          取消导出
        </Button>
      </Space>
      <Row gutter={[12, 12]}>
        {devices.map((d) => {
          const total = d.capacityTotal ?? 0
          const free = d.capacityFree ?? 0
          const used = total > 0 ? total - free : 0
          const percent = total > 0 ? Math.round((used / total) * 100) : 0
          const checked = selected.has(d.id)
          return (
            <Col key={d.id} span={8}>
              <Card
                hoverable
                onClick={() => {
                  const next = new Set(selected)
                  if (checked) next.delete(d.id)
                  else next.add(d.id)
                  setSelected(next)
                }}
                title={d.label || '可移动设备'}
                extra={
                  <Space>
                    <Typography.Text type={checked ? 'success' : undefined}>
                      {checked ? '已选择' : '未选择'}
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
                <Space direction="vertical" style={{ width: '100%' }}>
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
        open={!!progress.taskId}
        title="导出进度"
        onCancel={() => setProgress({ success: 0, failed: 0, total: 0 })}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Progress percent={percent} />
          <Typography.Text>成功：{progress.success}</Typography.Text>
          <Typography.Text>失败：{progress.failed}</Typography.Text>
          <Typography.Text>总数：{progress.total}</Typography.Text>
        </Space>
      </Modal>
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
        <Space direction="vertical" style={{ width: '100%' }}>
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
