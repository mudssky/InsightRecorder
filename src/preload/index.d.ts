import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getSystemTheme: () => 'dark' | 'light'
      onSystemThemeUpdated: (handler: (mode: 'dark' | 'light') => void) => () => void
      getUserThemeMode: () => Promise<'light' | 'dark' | 'system' | undefined>
      setUserThemeMode: (mode: 'light' | 'dark' | 'system') => Promise<boolean>
      getAppSetting: <
        K extends
          | 'exportTargetPath'
          | 'renameTemplate'
          | 'extensions'
          | 'concurrency'
          | 'retryCount'
          | 'clearAfterExport'
      >(
        key: K
      ) => Promise<
        K extends 'exportTargetPath'
          ? string | undefined
          : K extends 'renameTemplate'
            ? string | undefined
            : K extends 'extensions'
              ? string[] | undefined
              : K extends 'concurrency' | 'retryCount'
                ? number | undefined
                : boolean | undefined
      >
      updateAppSettings: (
        partial: Partial<{
          exportTargetPath: string
          renameTemplate: string
          extensions: string[]
          concurrency: number
          retryCount: number
          clearAfterExport: boolean
        }>
      ) => Promise<boolean>
      getAppSettings: () => Promise<{
        exportTargetPath: string
        renameTemplate: string
        extensions: string[]
        concurrency: number
        retryCount: number
        clearAfterExport: boolean
      }>
      setAppSettings: (payload: {
        exportTargetPath: string
        renameTemplate: string
        extensions: string[]
        concurrency: number
        retryCount: number
        clearAfterExport: boolean
      }) => Promise<boolean>
      listDevices: () => Promise<
        Array<{
          id: string
          label?: string
          mountpoint: string
          capacityTotal?: number
          capacityFree?: number
          lastSeenAt: number
        }>
      >
      startExport: (payload: { deviceIds: string[] }) => Promise<{ taskId: string }>
      getExportSummary: (limit: number) => Promise<
        Array<{
          id: string
          startedAt: number
          endedAt?: number
          status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
          total?: number
          success?: number
          failed?: number
          error?: string
          deviceIds?: string[]
        }>
      >
      onExportProgress: (
        handler: (payload: {
          taskId: string
          stage: 'skip' | 'copied' | 'failed'
          currentFile: string
          successCount: number
          failCount: number
          total: number
          error?: string
        }) => void
      ) => () => void
      cancelExport: (taskId: string) => Promise<boolean>
      onDeviceChanged: (
        handler: (payload: { action: 'added' | 'removed'; ts: number }) => void
      ) => () => void
    }
  }
}
