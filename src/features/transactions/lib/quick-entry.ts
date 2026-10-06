import type { Account, Category, TransactionWithDetails } from '@/types'
import { linkedTo } from './ledger'

/**
 * Quick entry: fill the add-transaction form from a line like "makan siang 35rb gopay",
 * or from a frequent transaction. Nothing here saves; the form shows the result for a check.
 */

const UNITS: Record<string, number> = {
    k: 1_000, rb: 1_000, ribu: 1_000, rbu: 1_000,
    jt: 1_000_000, juta: 1_000_000, m: 1_000_000,
}

/** "35rb", "35k", "1,5jt", "1.5jt", "35.000", "35000"; a lone unit is read from the next word. */
const AMOUNT = /^(?:rp\.?)?(\d+(?:[.,]\d+)*)(k|rb|rbu|ribu|jt|juta|m)?$/i

/**
 * A rupiah amount from shorthand. With a unit, "," and "." are decimal points ("1,5jt");
 * without one they're thousands separators ("35.000"). Null when it isn't an amount.
 */
export function parseShortAmount(word: string, nextWord?: string): number | null {
    const match = AMOUNT.exec(word.trim())
    if (!match) return null
    const [, digits, attached] = match
    const unit = (attached ?? (nextWord && UNITS[nextWord.toLowerCase()] ? nextWord : ''))?.toLowerCase()
    if (unit) {
        const value = Number(digits.replace(',', '.').replace(/\.(?=.*\.)/g, ''))
        return Number.isFinite(value) && value > 0 ? Math.round(value * UNITS[unit]) : null
    }
    const value = Number(digits.replace(/[.,]/g, ''))
    return value > 0 ? value : null
}

/** Everyday words for the default categories, matched against the user's own category names. */
const CATEGORY_HINTS: { words: RegExp; category: RegExp }[] = [
    { words: /^(makan|minum|kopi|ngopi|jajan|sarapan|lunch|dinner|breakfast|snack|bakso|nasi|mie|warteg|resto|cafe|kafe|boba)$/, category: /food|makan|kuliner|minum/i },
    { words: /^(sayur|buah|indomaret|alfamart|supermarket|pasar|beras|telur|minyak|galon)$/, category: /grocer|belanja.*(harian|bulanan|dapur)|dapur|sembako/i },
    { words: /^(gojek|goride|grab|grabbike|ojek|ojol|parkir|tol|kereta|krl|mrt|lrt|busway|transjakarta|taksi|taxi|bus|angkot)$/, category: /transport|ojek|perjalanan/i },
    { words: /^(bensin|pertalite|pertamax|bbm|solar)$/, category: /fuel|bensin|bbm/i },
    { words: /^(obat|dokter|apotek|klinik|vitamin|rs)$/, category: /health|kesehatan|obat/i },
    { words: /^(nonton|bioskop|film|game|konser|karaoke)$/, category: /entertain|hiburan/i },
    { words: /^(baju|sepatu|celana|tas|shopee|tokopedia|tokped|lazada)$/, category: /shop|belanja/i },
    { words: /^(listrik|pln|token|pdam|air|gas)$/, category: /utilit|listrik|tagihan/i },
    { words: /^(pulsa|kuota|paket|wifi|indihome|internet)$/, category: /internet|pulsa|kuota/i },
    { words: /^(netflix|spotify|youtube|disney|icloud|langganan)$/, category: /subscri|langganan/i },
    { words: /^(gaji|gajian|salary|payroll)$/, category: /salary|gaji/i },
    { words: /^(bonus|thr)$/, category: /bonus|thr/i },
    { words: /^(freelance|project|proyek|fee)$/, category: /freelance|proyek/i },
]

/** Words that say the money came in. */
const INCOME_WORDS = /^(gaji|gajian|salary|payroll|bonus|thr|terima|dapat|dapet|masuk|income|refund|cashback)$/

const STOP_WORDS = new Set(['di', 'ke', 'dari', 'pakai', 'pake', 'via', 'dengan', 'buat', 'untuk', 'and', 'at', 'with', 'from', 'for'])

export interface QuickEntry {
    type: 'income' | 'expense'
    amount: number | null
    accountId: string | null
    categoryId: string | null
    note: string
}

interface QuickEntryContext {
    accounts: Pick<Account, 'id' | 'name'>[]
    categories: Pick<Category, 'id' | 'name' | 'type'>[]
    /** Past transactions: notes the user wrote teach which category a word belongs to. */
    history: TransactionWithDetails[]
}

const words = (text: string) => text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The account named in the text, longest name first so "BCA Syariah" beats "BCA". */
function findAccount(lower: string, accounts: QuickEntryContext['accounts']) {
    const byLength = [...accounts].sort((a, b) => b.name.length - a.name.length)
    for (const account of byLength) {
        const name = account.name.toLowerCase().trim()
        if (name && new RegExp(`(^|\\s)${escapeRegExp(name)}(?=\\s|$)`).test(lower)) {
            return { account, words: words(name) }
        }
    }
    // A single distinctive word of a longer name ("gopay" for "GoPay Wallet").
    const textWords = new Set(words(lower))
    for (const account of byLength) {
        const hit = words(account.name).find(w => w.length >= 3 && textWords.has(w))
        if (hit) return { account, words: [hit] }
    }
    return null
}

/** Category votes from the user's own notes: "kopi" written under Food & Drinks before. */
function historyVotes(noteWords: string[], history: TransactionWithDetails[]) {
    const votes = new Map<string, number>()
    const wanted = new Set(noteWords.filter(w => w.length >= 3))
    if (wanted.size === 0) return votes
    for (const tx of history) {
        if (!tx.note || !tx.category_id || linkedTo(tx)) continue
        const hits = words(tx.note).filter(w => wanted.has(w)).length
        if (hits) votes.set(tx.category_id, (votes.get(tx.category_id) ?? 0) + hits)
    }
    return votes
}

export function parseQuickEntry(text: string, { accounts, categories, history }: QuickEntryContext): QuickEntry {
    const raw = text.trim().split(/\s+/).filter(Boolean)
    const used = new Set<number>()

    // Amount: the first word that reads as one, with a unit attached or as the next word.
    let amount: number | null = null
    for (let i = 0; i < raw.length && amount === null; i++) {
        const next = raw[i + 1]
        amount = parseShortAmount(raw[i], next)
        if (amount !== null) {
            used.add(i)
            if (next && UNITS[next.toLowerCase()] && !/[a-z]$/i.test(raw[i])) used.add(i + 1)
        }
    }

    const rest = raw.filter((_, i) => !used.has(i))
    const lower = rest.join(' ').toLowerCase()

    const accountHit = findAccount(lower, accounts)
    const accountWords = new Set(accountHit?.words ?? [])
    const noteParts = rest.filter(w => !accountWords.has(w.toLowerCase()))
    // A trailing "pakai"/"via" belonged to the account that was taken out.
    while (noteParts.length && STOP_WORDS.has(noteParts[noteParts.length - 1].toLowerCase())) noteParts.pop()
    const noteWords = words(noteParts.join(' '))

    const type: QuickEntry['type'] = noteWords.some(w => INCOME_WORDS.test(w)) ? 'income' : 'expense'
    const ofType = categories.filter(c => c.type === type)

    const categoryId = (() => {
        const votes = historyVotes(noteWords, history)
        const best = [...votes.entries()]
            .filter(([id]) => ofType.some(c => c.id === id))
            .sort((a, b) => b[1] - a[1])[0]
        if (best) return best[0]
        const named = ofType.find(c => words(c.name).some(w => w.length >= 3 && noteWords.includes(w)))
        if (named) return named.id
        for (const hint of CATEGORY_HINTS) {
            if (!noteWords.some(w => hint.words.test(w))) continue
            const match = ofType.find(c => hint.category.test(c.name))
            if (match) return match.id
        }
        return null
    })()

    const note = noteParts.join(' ')
    return {
        type,
        amount,
        accountId: accountHit?.account.id ?? null,
        categoryId,
        note: note.charAt(0).toUpperCase() + note.slice(1),
    }
}

export interface FrequentEntry {
    key: string
    type: 'income' | 'expense'
    amount: number
    accountId: string
    categoryId: string | null
    note: string
    label: string
    count: number
}

/**
 * What the user records again and again: the same note, category and account. The amount
 * is the latest one, since prices drift. Only repeats count, and feature-made rows don't.
 */
export function frequentEntries(txs: TransactionWithDetails[], limit = 6): FrequentEntry[] {
    const groups = new Map<string, { latest: TransactionWithDetails; count: number }>()
    for (const tx of txs) {
        if ((tx.type !== 'income' && tx.type !== 'expense') || linkedTo(tx)) continue
        const note = (tx.note ?? '').trim()
        if (!note && !tx.category_id) continue
        const key = [tx.type, note.toLowerCase(), tx.category_id ?? '', tx.account_id].join('|')
        const group = groups.get(key)
        if (!group) { groups.set(key, { latest: tx, count: 1 }); continue }
        group.count++
        if (`${tx.date}${tx.created_at ?? ''}` > `${group.latest.date}${group.latest.created_at ?? ''}`) group.latest = tx
    }
    return [...groups.entries()]
        .filter(([, g]) => g.count >= 2)
        .sort((a, b) => b[1].count - a[1].count || b[1].latest.date.localeCompare(a[1].latest.date))
        .slice(0, limit)
        .map(([key, { latest, count }]) => ({
            key,
            type: latest.type as 'income' | 'expense',
            amount: latest.amount,
            accountId: latest.account_id,
            categoryId: latest.category_id,
            note: (latest.note ?? '').trim(),
            label: (latest.note ?? '').trim() || latest.category?.name || 'Transaction',
            count,
        }))
}
