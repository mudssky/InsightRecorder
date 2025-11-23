import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts']
  },
  resolve: {
    alias: {
      '@renderer': 'src/renderer/src',
      '@main': 'src/main',
      '@preload': 'src/preload'
    }
  }
})
