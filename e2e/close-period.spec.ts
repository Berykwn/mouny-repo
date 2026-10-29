import { expect, test } from '@playwright/test'
import { requireCredentials } from './support/env'
import { dialog, main, sidebarLink, watchConsole } from './support/app'

requireCredentials()

// Look only: the drawer is opened, read and dismissed. Its close button is never pressed;
// a closed period can't be reopened.
test('the close-period drawer shows the recap, and cancelling leaves the period open', async ({ page }) => {
    const watched = watchConsole(page)

    await page.goto('/')
    await sidebarLink(page, 'Periods').click()
    await expect(page).toHaveURL(/\/period-history$/)
    const active = main(page).getByText('Active', { exact: true })
    const openOne = main(page).getByRole('button', { name: 'Open a period' })
    await expect(active.or(openOne)).toBeVisible()
    test.skip(await openOne.isVisible(), 'The demo account has no open period to close.')

    await page.getByRole('button', { name: 'Close period', exact: true }).click()
    const drawer = dialog(page, /^Close /)
    await expect(drawer).toBeVisible()

    // The recap: what was kept, against the usual, and the numbers it would close on.
    await expect(drawer.getByText('Kept', { exact: true })).toBeVisible()
    await expect(drawer.getByText(/% of income$|^No income recorded$/)).toBeVisible()
    await expect(drawer.getByText('vs your median')).toBeVisible()
    await expect(drawer.getByText(/ pts$|^Shows after two closed periods\.$/)).toBeVisible()
    await expect(drawer.getByText('Closing balance')).toBeVisible()
    await expect(drawer.getByRole('button', { name: /^Closing date/ })).toBeVisible()
    await expect(drawer.getByRole('switch')).toBeVisible()
    await expect(drawer.getByRole('button', { name: /^(Close & open the next one|Close period)$/ })).toBeEnabled()

    // Cancel: the drawer's own close button, not the one that closes the period.
    await drawer.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(drawer).toBeHidden()

    // Still running, after a fresh load from the server too.
    await expect(active).toBeVisible()
    await page.reload()
    await expect(main(page).getByText('Active', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Close period', exact: true })).toBeVisible()

    expect(watched.errors).toEqual([])
})
