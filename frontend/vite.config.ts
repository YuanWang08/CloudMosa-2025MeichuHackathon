import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const allowedHosts =
  (process.env.VITE_ALLOWED_HOSTS || 'hackathon-wc0l3p.puffin.app,frontend')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const enableDevtools = process.env.VITE_ENABLE_VUE_DEVTOOLS === 'true'

  const plugins = [vue(), tailwindcss()]
  if (enableDevtools) plugins.push(vueDevTools())

  return {
    plugins,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      allowedHosts,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
        },
        '/tts': {
          target: process.env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
        },
      },
      host: true,
      port: 5173,
    },
  }
})
