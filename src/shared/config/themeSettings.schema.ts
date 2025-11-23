import { z } from 'zod'

export const ThemeSettingsSchema = z.enum(['light', 'dark', 'system'])

export type ThemeMode = z.infer<typeof ThemeSettingsSchema>

export const ThemeModeDefault: ThemeMode = 'system'

export const parseThemeMode = (input: unknown): ThemeMode => {
  const r = ThemeSettingsSchema.safeParse(input)
  return r.success ? r.data : ThemeModeDefault
}
