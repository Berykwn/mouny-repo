import { expect, test, type Page } from '@playwright/test'
import { requireCredentials } from './support/env'
import { greetingHeading, watchConsole } from './support/app'

requireCredentials()

const palette = (page: Page) => page.getByRole('dialog', { name: 'Search and commands' })

test('Ctrl+K opens the palette; typing and Enter go to the page', async ({ page }) => {
    const watched = watchConsole(page)
    await page.goto('/')
    await expect(greetingHeading(page)).toBeVisible()

    await page.keyboard.press('Control+k')
    await expect(palette(page)).toBeVisible()
    const search = palette(page).getByRole('textbox', { name: 'Search' })
    await expect(search).toBeFocused()

    await search.fill('wishlist')
    await expect(palette(page).getByRole('option', { name: /^Wishlist/ })).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Enter')
    await expect(palette(page)).toBeHidden()
    await expect(page).toHaveURL(/\/wish-list$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Wishlist' })).toBeVisible()

    expect(watched.errors).toEqual([])
})

test('the palette moves with the arrows, opens on click, and Escape closes it', async ({ page }) => {
    const watched = watchConsole(page)
    await page.goto('/transactions')
    await expect(page.getByRole('heading', { level: 1, name: 'Ledger' })).toBeVisible()

    // The top bar's Search button opens the same palette.
    await page.getByRole('button', { name: 'Search and commands' }).click()
    await expect(palette(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(palette(page)).toBeHidden()
    await expect(page).toHaveURL(/\/transactions$/)

    await page.keyboard.press('Control+k')
    const pages = palette(page).getByRole('group', { name: 'Pages' })
    await expect(pages.getByRole('option', { name: 'Accounts' })).toBeVisible()
    await pages.getByRole('option', { name: 'Accounts' }).click()
    await expect(palette(page)).toBeHidden()
    await expect(page).toHaveURL(/\/accounts$/)

    // Empty, it's a menu: the first entry is picked, and the arrows move the pick.
    await page.keyboard.press('Control+k')
    const options = palette(page).getByRole('option')
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('ArrowDown')
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'false')
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('ArrowUp')
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.type('periods')
    await expect(options.first()).toHaveText(/^Periods/)
    await page.keyboard.press('Enter')
    await expect(palette(page)).toBeHidden()
    await expect(page).toHaveURL(/\/period-history$/)

    expect(watched.errors).toEqual([])
})
