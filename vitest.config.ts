import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts'],
      setupFiles: ['src/domain/__tests__/setup.ts'],
    },
  }),
)
