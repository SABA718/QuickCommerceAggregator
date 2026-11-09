import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import process from 'node:process'

export default defineConfig({
  plugins: [
    {
      name: 'dealdock-site-metadata',
      enforce: 'pre',
      transformIndexHtml(html) {
        const siteUrl = (process.env.VITE_SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
        return html.replaceAll('__DEALDOCK_SITE_URL__', siteUrl);
      },
    },
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://localhost:3000", "/health": "http://localhost:3000" },
  }
})
