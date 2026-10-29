import { expect, test } from '@playwright/test'
import { credentials, requireCredentials } from './support/env'
import { dialog, greetingHeading, main, signIn, watchConsole } from './support/app'

requireCredentials()

// Starts signed out; runs before `setup`, so its logout can't end the session the rest reuse.
test.use({ storageState: { cookies: [], origins: [] } })

test('signed out, the app sends you to the login page', async ({ page }) => {
    await page.goto('/transactions')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})

test('login shows Home with the greeting and the hero; logout and login again', async ({ page }) => {
    const watched = watchConsole(page)

    await signIn(page, credentials.email, credentials.password)

    // The hero: "safe to spend" with its amount.
    const hero = main(page).getByRole('region', { name: 'Safe to spend' })
    await expect(hero).toBeVisible()
    await expect(hero).toContainText(/Rp/)
    await expect(greetingHeading(page)).toBeVisible()

    // Logout from Settings, through its confirmation.
    await page.getByRole('complementary').getByRole('link', { name: /^Settings$/ }).click()
    await expect(page).toHaveURL(/\/menu$/)
    await main(page).getByRole('button', { name: 'Log out' }).click()
    await dialog(page, 'Log out').getByRole('button', { name: 'Log out' }).click()
    await expect(page).toHaveURL(/\/login$/)

    // Signed out for real: a protected page bounces back to login.
    await page.goto('/accounts')
    await expect(page).toHaveURL(/\/login$/)

    // And back in; the login returns to the page that asked for it.
    await page.getByLabel('Email').fill(credentials.email)
    await page.getByLabel('Password', { exact: true }).fill(credentials.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/accounts$/)
    await page.goto('/')
    await expect(greetingHeading(page)).toBeVisible()
    await expect(main(page).getByRole('region', { name: 'Safe to spend' })).toBeVisible()

    expect(watched.errors).toEqual([])
})
