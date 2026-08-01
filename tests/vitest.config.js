import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['../frontend/src/**/*.{js,jsx}'],
      exclude: ['../frontend/src/main.jsx'],
    },
  },
  resolve: {
    alias: {
      '../src': '../frontend/src',
    },
  },
})
