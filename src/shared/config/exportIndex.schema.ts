import { z } from 'zod'

export const ExportIndexSchema = z.record(z.string(), z.literal(true))

export type ExportIndex = z.infer<typeof ExportIndexSchema>
