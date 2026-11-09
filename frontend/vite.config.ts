/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000' },
  },
  preview: {
    proxy: { '/api': process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
