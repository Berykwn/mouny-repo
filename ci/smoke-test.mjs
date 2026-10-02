// Serves the production build and opens it in headless Chrome, failing if React didn't
// mount. Catches what lint, tests and the build itself don't: a bundle that loads but
// throws at startup, which users see as a blank page.
//
//   npm run build && npm run smoke
import { spawn, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const PORT = 4173
const ROUTES = ['/', '/login', '/transactions']

function findChrome() {
    const candidates = [
        process.env.CHROME_PATH,
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ]
    const found = candidates.find(p => p && existsSync(p))
    if (!found) throw new Error('No Chrome found; set CHROME_PATH.')
    return found
}

async function waitForServer(url, ms = 20_000) {
    const until = Date.now() + ms
    while (Date.now() < until) {
        try { if ((await fetch(url)).ok) return } catch { /* not up yet */ }
        await new Promise(r => setTimeout(r, 300))
    }
    throw new Error(`Preview server didn't start at ${url}`)
}

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
})

let failed = false
try {
    const base = `http://localhost:${PORT}`
    await waitForServer(base)
    const chrome = findChrome()

    for (const route of ROUTES) {
        const html = execFileSync(chrome, [
            '--headless=new', '--disable-gpu', '--no-sandbox',
            '--virtual-time-budget=5000', '--dump-dom', base + route,
        ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60_000 })

        // React mounted if #root has anything in it; a startup crash leaves it empty.
        const mounted = /<div id="root">\s*<[a-z]/i.test(html)
        console.log(`${mounted ? 'ok  ' : 'FAIL'} ${route}`)
        if (!mounted) failed = true
    }
} catch (err) {
    console.error(err)
    failed = true
} finally {
    if (process.platform === 'win32') {
        try { execFileSync('taskkill', ['/pid', String(preview.pid), '/T', '/F'], { stdio: 'ignore' }) } catch { /* gone */ }
    } else {
        preview.kill()
    }
}

if (failed) {
    console.error('Smoke test failed: the app did not render.')
    process.exit(1)
}
