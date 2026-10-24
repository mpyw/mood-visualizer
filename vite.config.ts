import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { resolveBase } from './scripts/base'

export default defineConfig({
  plugins: [react()],
  base: resolveBase(process.env.VITE_BASE_PATH),
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['{src,scripts}/**/*.test.{ts,tsx}'],
    // A zone far from JST, to prove that days and months are cut in JST.
    env: { TZ: 'America/Los_Angeles' },
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      include: ['src/**', 'scripts/**/*.ts'],
      exclude: ['src/main.tsx', 'src/test/**', '**/*.test.*'],
      thresholds: { statements: 90, branches: 85, functions: 90, lines: 90 },
    },
  },
})
