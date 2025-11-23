import { ipcRenderer } from 'electron'

export const getAppSetting = async <
  K extends
    | 'exportTargetPath'
    | 'renameTemplate'
    | 'extensions'
    | 'concurrency'
    | 'retryCount'
    | 'clearAfterExport'
>(
  key: K
): Promise<
  K extends 'exportTargetPath'
    ? string | undefined
    : K extends 'renameTemplate'
      ? string | undefined
      : K extends 'extensions'
        ? string[] | undefined
        : K extends 'concurrency' | 'retryCount'
          ? number | undefined
          : boolean | undefined
> => {
  return ipcRenderer.invoke('app-settings:get', key)
}

export const updateAppSettings = async (
  partial: Partial<{
    exportTargetPath: string
    renameTemplate: string
    extensions: string[]
    concurrency: number
    retryCount: number
    clearAfterExport: boolean
  }>
): Promise<boolean> => {
  return ipcRenderer.invoke('app-settings:update', partial)
}

export const getAppSettings = async (): Promise<{
  exportTargetPath: string
  renameTemplate: string
  extensions: string[]
  concurrency: number
  retryCount: number
  clearAfterExport: boolean
}> => {
  return ipcRenderer.invoke('app-settings:get-all')
}

export const setAppSettings = async (payload: {
  exportTargetPath: string
  renameTemplate: string
  extensions: string[]
  concurrency: number
  retryCount: number
  clearAfterExport: boolean
}): Promise<boolean> => {
  return ipcRenderer.invoke('app-settings:update', payload)
}
