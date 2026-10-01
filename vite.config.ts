import path from "path"
import { readFileSync } from "node:fs"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { VitePWA } from 'vite-plugin-pwa'
import Icons from 'unplugin-icons/vite'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'

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
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: 'Mouny',
        short_name: 'Mouny',
        description: 'Personal finance app',
        theme_color: '#000000',
        background_color: '#ffffff',
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
        ],
      },
    })],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    build: {
      rollupOptions: {
        output: {
          // Libraries change far less often than app code; in their own chunks they stay
          // cached across releases instead of re-downloading with every deploy.
          manualChunks(id) {
            // Recharts is left out on purpose: as a manual chunk, rollup makes the entry import
            // it for side effects; left alone it ships only with the pages that draw charts.
            if (!id.includes('node_modules')) return
            if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)) return 'supabase'
            if (/[\\/]node_modules[\\/](@tanstack|zustand)[\\/]/.test(id)) return 'state'
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) return 'react'
            if (/[\\/]node_modules[\\/](@radix-ui|radix-ui|@floating-ui)[\\/]/.test(id)) return 'radix'
          },
        },
      },
    },
  }
})
