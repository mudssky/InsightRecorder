import { z } from 'zod'

export const ExportTaskStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'SUCCESS',
  'FAILED',
  'CANCELLED'
])

export const ExportTaskSummarySchema = z
  .object({
    id: z.string(),
    startedAt: z.number().int(),
    endedAt: z.number().int().optional(),
    status: ExportTaskStatusSchema,
    total: z.number().int().optional(),
    success: z.number().int().optional(),
    failed: z.number().int().optional(),
    error: z.string().optional(),
    deviceIds: z.array(z.string()).optional()
  })
  .strict()

export const ExportHistorySchema = z.object({ tasks: z.array(ExportTaskSummarySchema) }).strict()

export type ExportTaskStatus = z.infer<typeof ExportTaskStatusSchema>
export type ExportTaskSummary = z.infer<typeof ExportTaskSummarySchema>
export type ExportHistory = z.infer<typeof ExportHistorySchema>
