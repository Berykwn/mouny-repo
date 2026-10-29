import { expect, test, type Locator, type Page } from '@playwright/test'
import { requireCredentials } from './support/env'
import { deleteLeftoverTransactions, findBillPayments } from './support/supabase'
import { dialog, formatRupiah, main, escapeRegExp, parseRupiah, sidebarLink, toast, watchConsole } from './support/app'

requireCredentials()

/** A section of the Bills page by its heading ("Due this period", "Paid this period"). */
const section = (page: Page, title: string): Locator =>
    // The innermost one: the page's own section contains them all.
    main(page).locator('section').filter({ has: page.getByRole('heading', { level: 2, name: title, exact: true }) }).last()

let leftover: { bill: string; amount: number; since: string } | null = null

test.afterEach(async () => {
    // Only if the test failed before its own delete: this bill, this odd amount, since the test began.
    if (leftover) {
        const ids = await findBillPayments(leftover.bill, leftover.amount, leftover.since)
        if (ids.length > 0) await deleteLeftoverTransactions({ ids })
    }
    leftover = null
})

test('pay a bill, see it paid, delete the payment, see it due again', async ({ page }) => {
    const watched = watchConsole(page)
    const since = new Date(Date.now() - 5 * 60_000).toISOString()

    await page.goto('/plan')
    await sidebarLink(page, 'Bills').click()
    await expect(page).toHaveURL(/\/bills$/)
    // Loaded: the bills' sections are on screen.
    await expect(main(page).getByRole('heading', { level: 2 }).first()).toBeVisible()

    const due = section(page, 'Due this period')
    test.skip(await due.count() === 0, 'No bill is due in the demo account’s open period, so there is nothing to pay.')

    // A bill with one due date left, so one payment marks it paid.
    const dueRows = due.locator(':scope > div > div').filter({ has: page.getByRole('button', { name: /^Pay / }) })
    await expect(dueRows.first()).toBeVisible()
    let row: Locator | null = null
    for (const candidate of await dueRows.all()) {
        if (!/· \d+ due/.test(await candidate.innerText())) { row = candidate; break }
    }
    test.skip(!row, 'Every due bill has more than one date left this period.')
    const billName = (await row!.getByRole('button').first().innerText()).split('\n')[0].trim()

    await row!.getByRole('button', { name: /^Pay / }).click()
    const form = dialog(page, `Pay ${billName}`)
    await expect(form).toBeVisible()

    // The usual amount plus a few rupiah: this payment, and no other, has that amount.
    const amountField = form.getByLabel('Amount paid')
    const usual = parseRupiah(await amountField.inputValue())
    const amount = usual + 1 + (Date.now() % 97)
    await amountField.fill(String(amount))
    leftover = { bill: billName, amount, since }

    await form.getByRole('button', { name: /^Pay Rp/ }).click()
    await expect(toast(page, `${billName} paid.`)).toBeVisible()
    await expect(form).toBeHidden()

    // Paid for this period, and no longer due.
    const paidRow = section(page, 'Paid this period').getByRole('button', { name: new RegExp(`^${escapeRegExp(billName)}\\b`) })
    await expect(paidRow).toBeVisible()
    await expect(section(page, 'Paid this period')).toContainText(formatRupiah(amount))
    await expect(due.getByRole('button', { name: new RegExp(`^${escapeRegExp(billName)}\\b`) })).toHaveCount(0)
    await paidRow.click()
    await expect(dialog(page, billName)).toContainText('Paid for this period.')
    await dialog(page, billName).getByRole('button', { name: 'Close', exact: true }).click()

    // The payment is a transaction linked to the bill; delete it from the Ledger.
    await sidebarLink(page, 'Ledger').click()
    await main(page).getByRole('searchbox', { name: 'Search transactions' }).fill(billName)
    const payment = main(page).getByRole('button', { name: new RegExp(`^${escapeRegExp(billName)}\\b.*${escapeRegExp(formatRupiah(amount))}$`) })
    await expect(payment).toHaveCount(1)
    await payment.click()
    const detail = page.getByRole('complementary', { name: 'Transaction detail' })
    await expect(detail).toContainText('Pays bill')
    await expect(detail).toContainText(`Pays ${billName}. Deleting it makes the bill due again`)
    await detail.getByRole('button', { name: 'Delete' }).click()
    await dialog(page, 'Delete Transaction').getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(toast(page, 'Transaction deleted.')).toBeVisible()
    await expect(payment).toHaveCount(0)
    leftover = null

    // Due again.
    await sidebarLink(page, 'Bills').click()
    await expect(section(page, 'Due this period').getByRole('button', { name: new RegExp(`^${escapeRegExp(billName)}\\b`) })).toBeVisible()
    await expect(section(page, 'Paid this period').getByRole('button', { name: new RegExp(`^${escapeRegExp(billName)}\\b`) })).toHaveCount(0)

    expect(watched.errors).toEqual([])
})
