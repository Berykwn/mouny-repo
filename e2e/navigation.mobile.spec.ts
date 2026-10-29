import { expect, test, type Page } from '@playwright/test'
import { requireCredentials } from './support/env'
import { expectNoHorizontalOverflow, greetingHeading, main, settle, visitInsightsTabs, watchConsole } from './support/app'

requireCredentials()

/** The tab bar along the bottom of a phone screen. */
const tabBar = (page: Page) => page.getByRole('navigation').filter({ has: page.getByRole('link', { name: 'Home', exact: true }) })

/** Checks the page arrived, has its heading, and fits a 390px window. */
async function arrived(page: Page, path: RegExp, title: string | RegExp) {
    await expect(page).toHaveURL(path)
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await settle(page)
    await expectNoHorizontalOverflow(page, String(title))
}

test('on a 390px phone the tab bar and links reach every page, nothing scrolls sideways', async ({ page }) => {
    const watched = watchConsole(page)
    expect(page.viewportSize()?.width).toBe(390)

    await page.goto('/')
    await expect(greetingHeading(page)).toBeVisible()
    await settle(page)
    await expectNoHorizontalOverflow(page, 'Home')
    // The sidebar is a desktop thing.
    await expect(page.getByRole('complementary').filter({ hasText: 'Mouny' })).toBeHidden()

    await tabBar(page).getByRole('link', { name: 'Ledger', exact: true }).click()
    await arrived(page, /\/transactions$/, 'Ledger')
    await expect(tabBar(page).getByRole('link', { name: 'Ledger', exact: true })).toHaveAttribute('aria-current', 'page')

    await tabBar(page).getByRole('link', { name: 'Insights', exact: true }).click()
    await arrived(page, /\/insights$/, 'Insights')
    await visitInsightsTabs(page)

    // Plan, and its pages from the chips under its title.
    for (const [chip, path] of [['Bills', /\/bills$/], ['Debts', /\/debts$/], ['Wishlist', /\/wish-list$/]] as const) {
        await tabBar(page).getByRole('link', { name: 'Plan', exact: true }).click()
        await arrived(page, /\/plan$/, 'Plan')
        await main(page).getByRole('navigation', { name: 'Plan' }).getByRole('link', { name: chip, exact: true }).click()
        await arrived(page, path, chip)
        // Plan's tab stays lit for the pages under it.
        await expect(tabBar(page).getByRole('link', { name: 'Plan', exact: true })).toHaveAttribute('aria-current', 'true')
    }

    // Settings from Home's avatar; Accounts, Categories and Periods from Settings.
    for (const [link, path] of [['Accounts', /\/accounts$/], ['Categories', /\/category$/], ['Periods', /\/period-history$/]] as const) {
        await tabBar(page).getByRole('link', { name: 'Home', exact: true }).click()
        await expect(greetingHeading(page)).toBeVisible()
        await main(page).getByRole('link', { name: 'Settings', exact: true }).click()
        await arrived(page, /\/menu$/, 'Settings')
        await main(page).getByRole('link', { name: new RegExp(`^${link}\\b`) }).click()
        await arrived(page, path, link)
        // Back to Settings with the page's own back button.
        await main(page).getByRole('button', { name: 'Back' }).click()
        await arrived(page, /\/menu$/, 'Settings')
    }

    expect(watched.errors).toEqual([])
})
