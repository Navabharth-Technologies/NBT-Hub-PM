import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.js$|.*\.js$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    port: 5175,
    strictPort: true,
    host: true,
    proxy: {
      '/api/etimeoffice': {
        target: 'https://api.etimeoffice.com/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/etimeoffice/, '')
      }
    }
  },
})
