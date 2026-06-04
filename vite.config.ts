import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    // Wipe dist/ on every build so we don't accumulate dozens of stale
    // index-XXXXX.js chunks. Without this, browsers occasionally fetch an
    // older hashed chunk because the HTML serves a different one. Found
    // 5+ index-* chunks in dist/ that all should have been cleaned.
    emptyOutDir: true,
    // Split vendor space so a feature-only change does not invalidate the
    // entire vendor bundle for return visitors. Buckets chosen by usage
    // patterns identified in audit/04-performance.md §3.2.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui-vendor'
          if (id.includes('@radix-ui')) return 'radix-vendor'
          if (id.includes('recharts') || id.includes('/d3-')) return 'recharts-vendor'
          if (id.includes('@stomp') || id.includes('sockjs-client')) return 'stomp-vendor'
          if (id.includes('qrcode.react') || id.includes('/qrcode/')) return 'qr-vendor'
          if (id.includes('/motion/') || id.includes('framer-motion')) return 'motion-vendor'
          if (
            id.includes('react-router') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/') ||
            id.match(/[\\/]react[\\/]/)
          ) {
            return 'react-vendor'
          }
          return undefined
        },
      },
    },
    // chunkSizeWarningLimit kept at default 500 KB.
  },

  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
    // Force the browser to never serve a stale dev module. Without this we
    // saw the browser holding on to an old dashboard.tsx chunk that still
    // showed the pre-audit "Could not load verification QR" toast text long
    // after the source was rewritten. The dev server should always be
    // authoritative, never the HTTP cache.
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
})
