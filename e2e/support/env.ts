import { existsSync } from 'node:fs'
import { test } from '@playwright/test'

// Loaded here as well as in the config: test workers import this, not the config.
if (existsSync('.env.e2e.local') && !process.env.E2E_EMAIL) process.loadEnvFile('.env.e2e.local')

/** Where the setup project saves the signed-in session for the other projects. */
export const AUTH_FILE = 'playwright/.auth/user.json'

export const credentials = {
    email: process.env.E2E_EMAIL ?? '',
    password: process.env.E2E_PASSWORD ?? '',
}

export const hasCredentials = !!credentials.email.trim() && !!credentials.password.trim()

/** Call at the top of a spec file: without the demo account, every test in it skips. */
export function requireCredentials() {
    test.skip(!hasCredentials, 'No demo account: set E2E_EMAIL and E2E_PASSWORD in .env.e2e.local (see .env.e2e.example).')
}

/** A note no real record has, so the test can find (and remove) exactly what it made. */
export function e2eTag(): string {
    return `e2e-${Date.now()}`
}
