import { Layout, Tabs, List, Table, Typography, Input, Space, Button, Tag } from 'antd'
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
    <Layout className="h-full">
      <Layout.Sider width={280} className="bg-white border-r">
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
                    <List.Item className="cursor-pointer px-4">{item}</List.Item>
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
                    <List.Item className="cursor-pointer px-4">{item}</List.Item>
                  )}
                />
              )
            }
          ]}
        />
      </Layout.Sider>

      <Layout className="bg-white min-w-0">
        <Layout.Header className="bg-white border-b">
          <div className="flex items-center gap-2">
            <Typography.Title level={5} className="!mb-0">
              文件列表
            </Typography.Title>
            <div className="flex-1" />
            <Space>
              <Input.Search placeholder="搜索文件名/标签" style={{ width: 280 }} allowClear />
              <Button type="primary">导出选中</Button>
            </Space>
          </div>
        </Layout.Header>
        <Layout.Content className="p-4">
          <Table<FileItem>
            size="small"
            columns={columns}
            dataSource={data}
            pagination={{ pageSize: 10 }}
            rowSelection={{}}
          />
        </Layout.Content>
      </Layout>

      <Layout.Sider width={420} className="bg-white border-l">
        <Tabs
          items={[
            {
              key: 'player',
              label: '播放器',
              children: (
                <div className="p-4">
                  <div className="h-40 bg-gray-100 rounded mb-4" />
                  <Space>
                    <Button>播放/暂停</Button>
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
                  <Typography.Paragraph className="text-gray-600">
                    选择文件后在此显示转写文本与时间戳
                  </Typography.Paragraph>
                  <div className="h-64 bg-gray-50 rounded" />
                </div>
              )
            }
          ]}
        />
      </Layout.Sider>
    </Layout>
  )
}
