import { test as setup } from '@playwright/test'
import { AUTH_FILE, credentials, requireCredentials } from './support/env'
import { signIn } from './support/app'

requireCredentials()

setup.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 1280, height: 800 } })

// One sign-in for the whole run; the desktop and mobile projects start from this session.
setup('sign in as the demo account', async ({ page }) => {
    await signIn(page, credentials.email, credentials.password)
    await page.context().storageState({ path: AUTH_FILE })
})
