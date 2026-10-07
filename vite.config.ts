import path from "path"
import { readFileSync } from "node:fs"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { VitePWA } from 'vite-plugin-pwa'
import Icons from 'unplugin-icons/vite'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'

const CHART_LIBS = /[\\/]node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|internmap|decimal\.js-light|@reduxjs|redux|redux-thunk|react-redux|reselect|immer|es-toolkit|eventemitter3|tiny-invariant)[\\/]/

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    // `||`, not `??`: an empty VITE_BASE_URL (as in .env.example) should still mean "/".
    base: env.VITE_BASE_URL || "/",
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [react(), tailwindcss(), Icons({
      compiler: 'jsx',
      jsx: 'react',
      customCollections: { app: FileSystemIconLoader('./src/assets/icons') },
    }), VitePWA({
      // A new version waits for the user's Reload (src/lib/register-sw.ts), not mid-form.
      registerType: 'prompt',
      // Off in dev: a service worker there serves cached files and hides your edits.
      devOptions: {
        enabled: false,
      },
      // The glob below already precaches the manifest icons.
      includeManifestIcons: false,
      workbox: {
        // The default leaves out fonts, so offline the app would fall back to a system font.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Reminders: shows pushed notifications and opens the app when one is tapped.
        importScripts: ['push-sw.js'],
      },
      manifest: {
        name: 'Mouny',
        short_name: 'Mouny',
        description: 'Personal finance app',
        // The app's light background (neutral-50), so the title bar and the launch screen
        // blend in. A manifest can't vary by theme; index.html and ThemeContext do that.
        theme_color: '#fafafa',
        background_color: '#fafafa',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          // Android crops icons to its own shape; this one has room around the logo for it.
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    })],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    build: {
      // The single vendor chunk below is ~720 kB (~215 kB gzip) on purpose; warn only if it
      // grows well past that.
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          // Libraries change far less often than app code; in their own chunk they stay
          // cached across releases instead of re-downloading with every deploy.
          //
          // One vendor chunk, not one per library: split ones import each other (radix needs
          // react, and rollup puts shared helpers in whichever chunk it likes), and a cycle
          // between chunks leaves a module uninitialised at startup, which is a blank page.
          //
          // The charts library and its dependencies stay out, so they ship only with the
          // pages that draw charts.
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (CHART_LIBS.test(id)) return
            return 'vendor'
          },
        },
      },
    },
  }
})
