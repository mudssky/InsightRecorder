import { Dropdown, Button, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import { DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import { useTheme } from '../theme/context'

type Variant = 'button' | 'icon'

function iconFor(mode: 'system' | 'light' | 'dark'): React.JSX.Element {
  if (mode === 'light') return <SunOutlined />
  if (mode === 'dark') return <MoonOutlined />
  return <DesktopOutlined />
}

export default function ThemeToggle({
  variant = 'button',
  showLabel = true,
  size = 'middle',
  className
}: {
  variant?: Variant
  showLabel?: boolean
  size?: 'small' | 'middle'
  className?: string
}): React.JSX.Element {
  const { themeMode, setThemeMode } = useTheme()

  const items: MenuProps['items'] = [
    { key: 'system', label: '系统', icon: <DesktopOutlined /> },
    { key: 'light', label: '浅色', icon: <SunOutlined /> },
    { key: 'dark', label: '深色', icon: <MoonOutlined /> }
  ]

  const button = (
    <Button size={size} type="default" className={className} icon={iconFor(themeMode)}>
      {showLabel
        ? themeMode === 'system'
          ? '系统'
          : themeMode === 'light'
            ? '浅色'
            : '深色'
        : null}
    </Button>
  )

  if (variant === 'icon') {
    return (
      <Dropdown
        trigger={['click']}
        menu={{ items, onClick: (e) => setThemeMode(e.key as 'system' | 'light' | 'dark') }}
      >
        <Tooltip title="主题">{button}</Tooltip>
      </Dropdown>
    )
  }

  return (
    <Dropdown
      trigger={['click']}
      menu={{ items, onClick: (e) => setThemeMode(e.key as 'system' | 'light' | 'dark') }}
    >
      {button}
    </Dropdown>
  )
}
