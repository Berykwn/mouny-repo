import { expect, type Locator, type Page } from '@playwright/test'

/** Amounts as the app writes them: "1.745.500" (id-ID grouping), with an optional minus. */
export function parseRupiah(text: string): number {
    const match = text.replace(/−/g, '-').match(/-?\s*(?:Rp\s*)?[\d.]+/g)
    if (!match) throw new Error(`No amount in "${text}"`)
    const last = match[match.length - 1].replace(/\s|Rp/g, '')
    return Number(last.replace(/\./g, ''))
}

/** Text to match literally inside a RegExp. */
export const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const formatRupiah =(n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

/** The page's main column (the sidebar and drawers sit outside it). */
export const main = (page: Page) => page.getByRole('main')

/** The open drawer or dialog with this title. */
export const dialog = (page: Page, name: string | RegExp) => page.getByRole('dialog', { name })

/** A Sonner toast with this text. */
export const toast = (page: Page, text: string | RegExp) =>
    page.locator('[data-sonner-toast]').filter({ hasText: text })

/**
 * Console errors and uncaught exceptions on the page from now on. Read `errors` at the end
 * of the test; it should be empty.
 */
export function watchConsole(page: Page): { errors: string[] } {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    page.on('pageerror', err => errors.push(`pageerror: ${err.message}`))
    return { errors }
}

/** Nothing on the page is wider than the window (no sideways scroll on a phone). */
export async function expectNoHorizontalOverflow(page: Page, where: string) {
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
    }))
    expect(scrollWidth, `${where} scrolls sideways (${scrollWidth}px wide in a ${clientWidth}px window)`).toBeLessThanOrEqual(clientWidth)
}

/** Waits for the page's skeletons and "Loading…" placeholders to go. */
export async function settle(page: Page) {
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page.getByText(/^Loading/)).toHaveCount(0)
}

const INSIGHTS_TABS = ['This period', 'Habits', 'Cash flow', 'Trends', 'What if']

/** Clicks through every Insights tab, checking each panel shows and fits the window. */
export async function visitInsightsTabs(page: Page) {
    const tabs = main(page).getByRole('tablist', { name: 'Insights' })
    for (const name of INSIGHTS_TABS) {
        const tab = tabs.getByRole('tab', { name, exact: true })
        await tab.click()
        await expect(tab).toHaveAttribute('aria-selected', 'true')
        await expect(main(page).getByRole('tabpanel', { name })).toBeVisible()
        await settle(page)
        await expectNoHorizontalOverflow(page, `Insights › ${name}`)
    }
}

/**
 * Each account's balance as the Accounts page lists it, by name. The page first shows the
 * cached copy and then refetches, so expecting a value means polling: see expectBalances.
 */
export async function readAccountBalances(page: Page): Promise<Record<string, number>> {
    if (!/\/accounts$/.test(page.url())) {
        await sidebarLink(page, 'Accounts').click()
        await expect(page).toHaveURL(/\/accounts$/)
    }
    const rows = main(page).getByRole('listitem').getByRole('button')
    await expect(rows.first()).toBeVisible()
    const balances: Record<string, number> = {}
    for (const row of await rows.all()) {
        const lines = (await row.innerText()).split('\n').map(l => l.trim()).filter(Boolean)
        balances[lines[0]] = parseRupiah(lines[lines.length - 1])
    }
    return balances
}

/** Opens Accounts and waits until the balances shown are these (the refetch has landed). */
export async function expectBalances(page: Page, expected: Record<string, number>) {
    await expect.poll(() => readAccountBalances(page), { timeout: 15_000 }).toEqual(expected)
}

/** The sidebar (desktop) link to a page; its name may carry a badge ("Bills 2 due"). */
export const sidebarLink = (page: Page, name: string): Locator =>
    page.getByRole('complementary').filter({ hasText: 'Mouny' }).getByRole('link', { name: new RegExp(`^${name}\\b`) })

/** Signs in through the login form and waits for Home. */
export async function signIn(page: Page, email: string, password: string) {
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(greetingHeading(page)).toBeVisible()
}

/** Home's hello: "Good morning, Budi", following the clock. */
export const greetingHeading = (page: Page) =>
    page.getByRole('heading', { level: 1, name: /^(Good (morning|afternoon|evening)|Up late)\b/ })
