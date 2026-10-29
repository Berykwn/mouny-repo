/**
 * End-to-end tests for the critical flows, run locally before a release against the built
 * app and the real Supabase project, signed in as a dedicated demo account.
 *
 *   1. Put the demo account in .env.e2e.local (see .env.e2e.example; *.local is gitignored).
 *   2. npm run e2e                      (builds, serves on :4320, runs everything)
 *      npm run e2e -- --project=mobile  (one project; --headed / --ui to watch)
 *      npx playwright show-report       (the last run's HTML report)
 *
 * It uses the installed Chrome, so there's no browser download. Not part of CI: it needs
 * real credentials and writes to (and then cleans up) real data. Every test removes what it
 * created, tagged with an "e2e-<timestamp>" note, and never edits existing records.
 *
 * Order: `auth` (login, logout, login) → `setup` (signs in once, saves the session) →
 * `desktop` and `mobile`, which reuse that session. One worker: they share one account.
 *
 * Safari: `npm run e2e:iphone` runs the phone tests in WebKit (Safari's engine) on an
 * iPhone-sized screen. It needs WebKit once: npx playwright install webkit.
 */
import { defineConfig, devices } from '@playwright/test'
import { AUTH_FILE, hasCredentials as hasCreds } from './e2e/support/env'

const PORT = 4320
const OUT_DIR = 'dist-e2e'

if (!hasCreds) console.warn('e2e: no demo account (E2E_EMAIL / E2E_PASSWORD in .env.e2e.local), so every test skips.')

const DESKTOP = { width: 1280, height: 800 }
const PHONE = { width: 390, height: 844 }
// The installed Chrome, so there's no browser download; the iphone project uses WebKit.
const CHROME = { channel: 'chrome' }

export default defineConfig({
    testDir: 'e2e',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    forbidOnly: !!process.env.CI,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: `http://localhost:${PORT}`,
        // The service worker would serve the previous build's cached files.
        serviceWorkers: 'block',
        locale: 'en-GB',
        // The demo data's dates are calendar days in Jakarta.
        timezoneId: 'Asia/Jakarta',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        { name: 'auth', testMatch: /auth\.spec\.ts/, use: { ...CHROME, viewport: DESKTOP } },
        { name: 'setup', testMatch: /auth\.setup\.ts/, dependencies: ['auth'], use: CHROME },
        {
            name: 'desktop',
            testIgnore: [/auth\.(spec|setup)\.ts/, /\.mobile\.spec\.ts/],
            dependencies: ['setup'],
            use: { ...CHROME, viewport: DESKTOP, storageState: hasCreds ? AUTH_FILE : undefined },
        },
        {
            name: 'mobile',
            testMatch: /\.mobile\.spec\.ts/,
            dependencies: ['setup'],
            use: { ...CHROME, viewport: PHONE, storageState: hasCreds ? AUTH_FILE : undefined },
        },
        // Only when asked for (e2e:iphone), so a plain run doesn't need WebKit installed.
        ...(process.env.E2E_WEBKIT ? [{
            name: 'iphone',
            testMatch: /\.mobile\.spec\.ts/,
            dependencies: ['setup'],
            use: { ...devices['iPhone 13'], storageState: hasCreds ? AUTH_FILE : undefined },
        }] : []),
    ],
    webServer: {
        // Its own output folder, so another `vite build` into dist/ mid-run can't swap the
        // chunks out from under the open page ("A new version is ready").
        command: `npm run build -- --outDir ${OUT_DIR} --emptyOutDir && npx vite preview --outDir ${OUT_DIR} --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
    },
})
