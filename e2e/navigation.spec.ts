import { expect, test } from '@playwright/test'
import { requireCredentials } from './support/env'
import { expectNoHorizontalOverflow, greetingHeading, settle, sidebarLink, visitInsightsTabs, watchConsole } from './support/app'

requireCredentials()

/** Every page the sidebar reaches, with the name the top bar gives it. */
const PAGES: { link: string; path: RegExp; title: string }[] = [
    { link: 'Home', path: /\/$/, title: 'Home' },
    { link: 'Ledger', path: /\/transactions$/, title: 'Ledger' },
    { link: 'Insights', path: /\/insights$/, title: 'Insights' },
    { link: 'Accounts', path: /\/accounts$/, title: 'Accounts' },
    { link: 'Plan', path: /\/plan$/, title: 'Plan' },
    { link: 'Bills', path: /\/bills$/, title: 'Bills' },
    { link: 'Debts', path: /\/debts$/, title: 'Debts' },
    { link: 'Wishlist', path: /\/wish-list$/, title: 'Wishlist' },
    { link: 'Categories', path: /\/category$/, title: 'Categories' },
    { link: 'Periods', path: /\/period-history$/, title: 'Periods' },
    { link: 'Settings', path: /\/menu$/, title: 'Settings' },
]

test('the sidebar reaches every page, with no console errors', async ({ page }) => {
    const watched = watchConsole(page)
    await page.goto('/')
    await expect(greetingHeading(page)).toBeVisible()

    for (const { link, path, title } of PAGES) {
        await sidebarLink(page, link).click()
        await expect(page, `${link} link`).toHaveURL(path)
        await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible()
        await expect(sidebarLink(page, link)).toHaveAttribute('aria-current', 'page')
        await settle(page)
        await expectNoHorizontalOverflow(page, title)
        if (link === 'Insights') await visitInsightsTabs(page)
    }

    expect(watched.errors).toEqual([])
})
