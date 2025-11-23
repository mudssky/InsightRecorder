import { z } from 'zod'

export const AppSettingsSchema = z
  .object({
    exportTargetPath: z.string(),
    renameTemplate: z.string(),
    extensions: z.array(z.string()).min(1),
    concurrency: z.number().int().min(1),
    retryCount: z.number().int().min(0),
    clearAfterExport: z.boolean(),
    autoSyncDefault: z.boolean(),
    deleteSourceAfterSyncDefault: z.boolean(),
    folderNameRuleDefault: z.enum(['label-id', 'id-date', 'label-date', 'custom'])
  })
  .strict()

export type AppSettings = z.infer<typeof AppSettingsSchema>

export const AppSettingsDefaults: AppSettings = {
  exportTargetPath: '',
  renameTemplate: '{date:YYYYMMDD}-{time:HHmmss}-{title}-{device}',
  extensions: ['wav', 'mp3', 'm4a'],
  concurrency: 1,
  retryCount: 0,
  clearAfterExport: false,
  autoSyncDefault: true,
  deleteSourceAfterSyncDefault: false,
  folderNameRuleDefault: 'label-id'
}

export const parseAppSettings = (input: unknown): AppSettings => {
  const r = AppSettingsSchema.partial().safeParse(input)
  const v = r.success ? r.data : {}
  return { ...AppSettingsDefaults, ...v }
}
