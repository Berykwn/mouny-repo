import { expect, test } from '@playwright/test'
import { e2eTag, requireCredentials } from './support/env'
import { deleteLeftoverTransactions } from './support/supabase'
import { dialog, expectBalances, formatRupiah, main, readAccountBalances, settle, sidebarLink, toast, watchConsole } from './support/app'

requireCredentials()

// Small and odd, so it never trips an "insufficient balance" and is easy to spot.
const AMOUNT = 1_234

let notes: string[] = []

test.afterEach(async () => {
    // Only if the test failed before its own delete: nothing else carries these notes.
    if (notes.length > 0) await deleteLeftoverTransactions({ notes })
    notes = []
})

test('add an expense, edit its note, delete it; the balance comes back', async ({ page }) => {
    const watched = watchConsole(page)
    const note = e2eTag()
    const edited = `${note}-edited`
    notes = [note, edited]

    // A fresh context has no cached data, so this first read is the server's.
    await page.goto('/accounts')
    await settle(page)
    const before = await readAccountBalances(page)

    // Add: amount, note, category and account.
    await page.getByRole('button', { name: 'Add transaction' }).click()
    const form = dialog(page, 'New transaction')
    await expect(form).toBeVisible()
    await expect(form.getByRole('button', { name: 'Expense' })).toHaveAttribute('aria-pressed', 'true')
    await form.getByLabel('Amount').fill(String(AMOUNT))
    await form.getByLabel('Note').fill(note)

    const categories = form.getByRole('group', { name: 'Category' }).getByRole('button')
    await expect(categories.first()).toBeVisible()
    const category = categories.nth(1)
    const categoryName = (await category.innerText()).trim()
    await category.click()
    await expect(category).toHaveAttribute('aria-pressed', 'true')

    // Any account other than the one the form picked, to exercise the picker.
    await form.getByRole('button', { name: /^Paid from/ }).click()
    const picker = dialog(page, 'Select account')
    // Account rows read "BCA Rp 1.745.500"; the picked one is pressed.
    const other = picker.getByRole('button', { name: /Rp/, pressed: false }).first()
    const accountName = (await other.innerText()).split('\n').map(l => l.trim()).filter(Boolean)[0]
    await other.click()
    await expect(picker).toBeHidden()
    await expect(form.getByRole('button', { name: /^Paid from/ })).toContainText(accountName)

    await form.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(toast(page, 'Saved. Noted in your ledger.')).toBeVisible()
    await expect(form).toBeHidden()

    // In the Ledger, with the note as its title.
    await sidebarLink(page, 'Ledger').click()
    await expect(page).toHaveURL(/\/transactions$/)
    await main(page).getByRole('searchbox', { name: 'Search transactions' }).fill(note)
    const row = main(page).getByRole('button', { name: new RegExp(`^${note}\\b`) })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText(formatRupiah(AMOUNT))
    await expect(row).toContainText(accountName)

    await row.click()
    const detail = page.getByRole('complementary', { name: 'Transaction detail' })
    await expect(detail).toContainText(note)
    await expect(detail).toContainText(categoryName)
    await expect(detail).toContainText(accountName)

    // Edit its note.
    await detail.getByRole('button', { name: 'Edit' }).click()
    const editForm = dialog(page, 'Edit transaction')
    await expect(editForm.getByLabel('Note')).toHaveValue(note)
    await editForm.getByLabel('Note').fill(edited)
    await editForm.getByRole('button', { name: 'Save changes' }).click()
    await expect(toast(page, 'Transaction updated.')).toBeVisible()
    await expect(editForm).toBeHidden()

    await main(page).getByRole('searchbox', { name: 'Search transactions' }).fill(edited)
    await expect(main(page).getByRole('button', { name: new RegExp(`^${edited}\\b`) })).toHaveCount(1)
    // While it exists, the account is down by the amount.
    await expectBalances(page, { ...before, [accountName]: before[accountName] - AMOUNT })

    // Delete it.
    await sidebarLink(page, 'Ledger').click()
    await main(page).getByRole('searchbox', { name: 'Search transactions' }).fill(edited)
    await main(page).getByRole('button', { name: new RegExp(`^${edited}\\b`) }).click()
    await page.getByRole('complementary', { name: 'Transaction detail' }).getByRole('button', { name: 'Delete' }).click()
    const confirm = dialog(page, 'Delete Transaction')
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(toast(page, 'Transaction deleted.')).toBeVisible()
    await expect(confirm).toBeHidden()
    await expect(main(page).getByRole('button', { name: new RegExp(`^${edited}\\b`) })).toHaveCount(0)
    await expect(main(page)).toContainText(`No notes match “${edited}” this period.`)
    notes = []

    // Every balance is back where it started.
    await expectBalances(page, before)

    expect(watched.errors).toEqual([])
})
