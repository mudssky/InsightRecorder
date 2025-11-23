import { Tabs, List, Table, Typography, Input, Space, Button, Tag, Card } from 'antd'
import type { ColumnsType } from 'antd/es/table'

type FileItem = {
  key: string
  name: string
  date: string
  duration: string
  size: string
  tags: string[]
}

const columns: ColumnsType<FileItem> = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 220 },
  { title: '日期', dataIndex: 'date', key: 'date', width: 140 },
  { title: '时长', dataIndex: 'duration', key: 'duration', width: 100 },
  { title: '大小', dataIndex: 'size', key: 'size', width: 100 },
  {
    title: '标签',
    dataIndex: 'tags',
    key: 'tags',
    render: (tags: string[]) => (
      <Space size={4} wrap>
        {tags.map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </Space>
    )
  }
]

const data: FileItem[] = [
  {
    key: '1',
    name: '会议-产品评审-20250110.wav',
    date: '2025-01-10 14:32',
    duration: '01:12:36',
    size: '512 MB',
    tags: ['会议', '评审']
  },
  {
    key: '2',
    name: '访谈-客户A-20250105.mp3',
    date: '2025-01-05 09:20',
    duration: '00:45:10',
    size: '128 MB',
    tags: ['访谈']
  }
]

export default function Library(): React.JSX.Element {
  return (
    <div className="h-full flex">
      <aside className="w-[280px] border-r bg-white dark:bg-gray-900 dark:border-gray-700 overflow-auto">
        <div className="px-4 py-3">
          <Typography.Title level={5} className="!mb-2">
            设备与项目
          </Typography.Title>
        </div>
        <Tabs
          items={[
            {
              key: 'devices',
              label: '设备',
              children: (
                <List
                  size="small"
                  dataSource={['Sony ICD-TX660', 'Olympus WS-853', 'Philips DVT4110']}
                  renderItem={(item) => (
                    <List.Item className="cursor-pointer px-4 py-2">{item}</List.Item>
                  )}
                />
              )
            },
            {
              key: 'projects',
              label: '项目',
              children: (
                <List
                  size="small"
                  dataSource={['产品评审', '客户访谈', '灵感记录']}
                  renderItem={(item) => (
                    <List.Item className="cursor-pointer px-4 py-2">{item}</List.Item>
                  )}
                />
              )
            }
          ]}
        />
      </aside>

      <section className="flex-1 min-w-0 flex flex-col">
        <div className="border-b dark:border-gray-700 bg-white dark:bg-gray-900 px-4">
          <div className="flex items-center gap-2">
            <Typography.Title level={5} className="!mb-0 dark:text-gray-200">
              文件列表
            </Typography.Title>
            <div className="flex-1" />
            <Space>
              <Input.Search placeholder="搜索文件名/标签" style={{ width: 280 }} allowClear />
              <Button type="primary">导出选中</Button>
            </Space>
          </div>
        </div>
        <div className="p-4 overflow-auto flex-1 bg-gray-50 dark:bg-gray-900">
          <Table<FileItem>
            size="small"
            columns={columns}
            dataSource={data}
            pagination={{ pageSize: 10, size: 'small' }}
            rowSelection={{ columnWidth: 48 }}
            tableLayout="fixed"
            sticky
          />
        </div>
      </section>

      <aside className="w-[420px] border-l dark:border-gray-700 bg-white dark:bg-gray-900 overflow-auto">
        <Tabs
          items={[
            {
              key: 'player',
              label: '播放器',
              children: (
                <div className="p-4">
                  <Card size="small" bordered title="预览" className="mb-4">
                    <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded" />
                  </Card>
                  <Space>
                    <Button type="primary">播放/暂停</Button>
                    <Button>快退</Button>
                    <Button>快进</Button>
                  </Space>
                </div>
              )
            },
            {
              key: 'transcript',
              label: '转写',
              children: (
                <div className="p-4">
                  <Typography.Paragraph className="text-gray-600 dark:text-gray-300">
                    选择文件后在此显示转写文本与时间戳
                  </Typography.Paragraph>
                  <Card size="small" variant="outlined">
                    <div className="h-64 bg-gray-50 dark:bg-gray-800 rounded" />
                  </Card>
                </div>
              )
            }
          ]}
        />
      </aside>
    </div>
  )
}
