/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const CSP_CONTENT = [
  "default-src 'self'",
  "script-src 'self' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://sheets.googleapis.com https://accounts.google.com https://nominatim.openstreetmap.org https://api.fda.gov",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src 'self' data: blob: https://accounts.google.com",
].join('; ')

function cspPlugin(): import('vite').Plugin {
  return {
    name: 'html-csp',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (ctx.server) return html // skip in dev
        return html.replace(
          '<!--CSP_META-->',
          `<meta http-equiv="Content-Security-Policy" content="${CSP_CONTENT}" />`,
        )
      },
    },
  }
}

export default defineConfig({
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
  // v4-8: Stub out html2canvas — jsPDF optional dep never used directly (saves ~201KB)
  resolve: {
    alias: {
      html2canvas: resolve(__dirname, 'src/stubs/html2canvas.ts'),
    },
  },
  server: {
    proxy: {
      // Forward /api/* to local Netlify Functions server (npm run dev:functions)
      // No rewrite needed — functions use `export const config = { path: '/api/...' }`
      '/api': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          pdf: ['jspdf', 'jspdf-autotable'],
          zip: ['jszip'],
          validation: ['zod'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
  plugins: [
    react(),
    tailwindcss(),
    cspPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'EHC Client Intake Assessment',
        short_name: 'EHC Assessment',
        description: 'Executive Home Care client intake assessment form wizard',
        theme_color: '#d97706',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
