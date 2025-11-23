import { ipcRenderer } from 'electron'

export const startExport = async (payload: {
  deviceIds: string[]
}): Promise<{ taskId: string }> => {
  return ipcRenderer.invoke('export:start', payload)
}

export const getExportSummary = async (
  limit: number
): Promise<
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
> => {
  return ipcRenderer.invoke('export:summary', limit)
}

export const onExportProgress = (
  handler: (payload: {
    taskId: string
    stage: 'skip' | 'copied' | 'failed'
    currentFile: string
    successCount: number
    failCount: number
    total: number
    error?: string
  }) => void
): (() => void) => {
  const listener = (
    _e: Electron.IpcRendererEvent,
    payload: {
      taskId: string
      stage: 'skip' | 'copied' | 'failed'
      currentFile: string
      successCount: number
      failCount: number
      total: number
      error?: string
    }
  ): void => handler(payload)
  ipcRenderer.on('export:progress', listener)
  return () => ipcRenderer.off('export:progress', listener)
}

export const cancelExport = async (taskId: string): Promise<boolean> => {
  return ipcRenderer.invoke('export:cancel', taskId)
}
