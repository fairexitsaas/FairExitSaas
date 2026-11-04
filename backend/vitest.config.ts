import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      AI_MODE: 'mock',
      NODE_ENV: 'test',
    },
  },
})

