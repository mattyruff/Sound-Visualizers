import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // relative base + ../schedule output so the built app can be committed
  // and served from the repo's GitHub Pages site at /schedule/
  base: './',
  build: {
    outDir: '../schedule',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4310',
    },
  },
})
