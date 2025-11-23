import { ipcRenderer } from 'electron'

export type ExportStartPayload = { deviceIds: string[] }
export type ExportSummaryItem = {
  id: string
  startedAt: number
  endedAt?: number
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  total?: number
  success?: number
  failed?: number
  error?: string
  deviceIds?: string[]
}
export type ExportProgressPayload = {
  taskId: string
  stage: 'skip' | 'copied' | 'failed'
  currentFile: string
  successCount: number
  failCount: number
  total: number
  error?: string
}

export const startExport = async (payload: ExportStartPayload): Promise<{ taskId: string }> => {
  return ipcRenderer.invoke('export:start', payload)
}

export const getExportSummary = async (limit: number): Promise<ExportSummaryItem[]> => {
  return ipcRenderer.invoke('export:summary', limit)
}

export const onExportProgress = (
  handler: (payload: ExportProgressPayload) => void
): (() => void) => {
  const listener = (_e: Electron.IpcRendererEvent, payload: ExportProgressPayload): void =>
    handler(payload)
  ipcRenderer.on('export:progress', listener)
  return () => ipcRenderer.off('export:progress', listener)
}

export const cancelExport = async (taskId: string): Promise<boolean> => {
  return ipcRenderer.invoke('export:cancel', taskId)
}
