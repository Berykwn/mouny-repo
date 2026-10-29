import path from "path"
import { readFileSync } from "node:fs"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { VitePWA } from 'vite-plugin-pwa'
import Icons from 'unplugin-icons/vite'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'

const CHART_LIBS = /[\\/]node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|internmap|decimal\.js-light|@reduxjs|redux|redux-thunk|react-redux|reselect|immer|es-toolkit|eventemitter3|tiny-invariant)[\\/]/

// `radix-ui` re-exports every Radix primitive. Startup code takes one from it (Label), and
// following it would count all the rest as needed at startup too. (lucide-react's index is
// followed on purpose: its icons are small, and in vendor they don't each become a file.)
const BARRELS = /[\\/]node_modules[\\/]radix-ui[\\/]/

type ModuleInfo = { isEntry: boolean; importedIds: readonly string[] } | null

/**
 * The modules the page runs at startup: the entry and what it imports, and so on, but not
 * what's behind an `import()`, which loads later. Barrels are left out; what startup code
 * uses through one ends up in the entry chunk instead.
 */
function startupModules(ids: Iterable<string>, getModuleInfo: (id: string) => ModuleInfo): Set<string> {
  const queue = [...ids].filter(id => getModuleInfo(id)?.isEntry)
  const found = new Set(queue)
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    for (const dep of getModuleInfo(id)?.importedIds ?? []) {
      if (found.has(dep) || BARRELS.test(dep)) continue
      found.add(dep)
      queue.push(dep)
    }
  }
  return found
}

let startup: Set<string> | null = null

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    // `||`, not `??`: an empty VITE_BASE_URL (as in .env.example) should still mean "/".
    base: env.VITE_BASE_URL || "/",
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [react(), tailwindcss(), {
      // Each build (or rebuild in watch mode) works out its own startup modules.
      name: 'reset-startup-modules',
      buildStart() { startup = null },
      // The vendor chunk must import nothing (see manualChunks below): a chunk it imports
      // that imports it back is a cycle, and a cycle is a blank page.
      generateBundle(_options, bundle) {
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk' && chunk.name === 'vendor' && chunk.imports.length > 0) {
            this.error(`The vendor chunk imports ${chunk.imports.join(', ')}; it must import nothing.`)
          }
        }
      },
    }, Icons({
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
        // The app's light page (white), so the title bar and the launch screen blend in.
        // A manifest can't vary by theme; index.html and ThemeContext do that.
        theme_color: '#ffffff',
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
      // The vendor chunk below is one piece on purpose; warn only if it grows well past its
      // ~500 kB (~160 kB gzip).
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          // Libraries change far less often than app code; in their own chunk they stay
          // cached across releases instead of re-downloading with every deploy.
          //
          // One vendor chunk, not one per library: split ones import each other (radix needs
          // react, and rollup puts shared helpers in whichever chunk it likes), and a cycle
          // between chunks leaves a module uninitialised at startup, which is a blank page.
          //
          // Only the libraries the app needs at startup go in it; ones only lazy code uses
          // (the date picker, the charts library, the dialogs and menus of the signed-in
          // pages) ship with the pages that use them. Nothing at startup imports those, so
          // the vendor chunk never imports back from them and no cycle can form.
          manualChunks(id, { getModuleIds, getModuleInfo }) {
            if (!id.includes('node_modules')) return
            if (CHART_LIBS.test(id)) return
            startup ??= startupModules(getModuleIds(), getModuleInfo)
            return startup.has(id) ? 'vendor' : undefined
          },
        },
      },
    },
  }
})
