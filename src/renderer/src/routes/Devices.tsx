import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Modal, Progress, Row, Space, Typography, message } from 'antd'

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

  const percent = useMemo(() => {
    const done = progress.success + progress.failed
    return progress.total > 0 ? Math.round((done / progress.total) * 100) : 0
  }, [progress])

  const refresh = async (): Promise<void> => {
    setLoading(true)
    try {
      const list = await window.api.listDevices()
      setDevices(list)
    } catch (e) {
      message.error(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    return () => {
      if (unsubscribe) unsubscribe()
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
                  <Typography.Text type={checked ? 'success' : undefined}>
                    {checked ? '已选择' : '未选择'}
                  </Typography.Text>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Typography.Text>挂载点：{d.mountpoint}</Typography.Text>
                  <Progress percent={percent} status="active" />
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
    </div>
  )
}
