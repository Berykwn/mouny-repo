import { useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { AccountTypeTile } from '@/components/account-type-icon'
import { BusyLabel } from '@/components/busy-label'
import { accountsService } from '@/services/accounts-categories.service'
import { pickerOrder } from '@/lib/account-roles'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { Account, CountAs } from '@/types'
import { actualBalance, choicesFor, COUNT_AS_HINT, COUNT_AS_LABEL, recordedFigure, suggestedAs } from '../lib/cash-count'

interface CashCountFormProps {
    accounts: Account[]
    /** Spending and income go in the active period; without one only a correction is possible. */
    hasActivePeriod: boolean
    onSuccess: () => void
}

const SUBMIT_BUTTON = 'w-full h-12 rounded-[14px] text-[13px] font-semibold text-on-action bg-action hover:bg-action/90 transition-colors disabled:opacity-50 disabled:pointer-events-none'

/**
 * Count what's actually in each account, and record the differences. Built for the day
 * after a week of not writing things down: type what the wallet and the bank apps say,
 * leave the rest empty, save once.
 */
export function CashCountForm({ accounts, hasActivePeriod, onSuccess }: CashCountFormProps) {
    const ordered = pickerOrder(accounts)
    const [typed, setTyped] = useState<Record<string, string>>({})
    // Only what the user changed; otherwise the suggestion for the difference applies.
    const [chosen, setChosen] = useState<Record<string, CountAs>>({})
    const [saving, setSaving] = useState(false)

    const lines = ordered.map(account => {
        const raw = typed[account.id] ?? ''
        const counted = raw !== ''
        const actual = counted ? actualBalance(account, parseCurrencyInput(raw)) : account.balance
        const diff = actual - account.balance
        const choices = hasActivePeriod ? choicesFor(diff) : ['correction' as const]
        const pick = chosen[account.id]
        const as: CountAs = pick && choices.includes(pick) ? pick : hasActivePeriod ? suggestedAs(diff) : 'correction'
        return { account, raw, counted, actual, diff, choices, as }
    })
    const changes = lines.filter(l => l.counted && l.diff !== 0)
    const unrecordedSpending = changes.filter(l => l.as === 'spending').reduce((s, l) => s - l.diff, 0)

    const save = async () => {
        if (changes.length === 0) { onSuccess(); return }
        setSaving(true)
        const failed: string[] = []
        // One account at a time, so one that fails doesn't stop the others; each is
        // atomic in the database.
        for (const l of changes) {
            const { error } = await accountsService.count(l.account.id, l.actual, l.as)
            if (error) failed.push(`${l.account.name}: ${error}`)
        }
        setSaving(false)
        if (failed.length > 0) {
            toast.error(failed.join(' · '))
            if (failed.length === changes.length) return
        }
        const done = changes.length - failed.length
        toast.success(unrecordedSpending > 0 && failed.length === 0
            ? `Counted. ${formatCurrency(unrecordedSpending)} noted as unrecorded spending.`
            : `Counted ${done} account${done === 1 ? '' : 's'}.`)
        onSuccess()
    }

    return (
        <div className="flex flex-col gap-4 pb-2">
            <p className="text-[13px] text-muted-ink leading-snug">
                Type what’s actually in each account right now. Leave the ones you didn’t check empty.
            </p>

            <ul className="flex flex-col gap-2">
                {lines.map(l => {
                    const credit = l.account.role === 'credit'
                    const inputId = `count-${l.account.id}`
                    return (
                        <li key={l.account.id} className="rounded-[14px] border border-line bg-surface px-3 py-3">
                            <div className="flex items-center gap-3">
                                <AccountTypeTile type={l.account.type} savings={l.account.is_savings} role={l.account.role} className="w-9 h-9" />
                                <div className="flex-1 min-w-0">
                                    <label htmlFor={inputId} className="block text-[13px] font-medium text-ink truncate">{l.account.name}</label>
                                    <p className="text-[11.5px] text-muted-ink tabular-nums">
                                        {credit ? 'Owed' : 'Recorded'} {formatCurrency(recordedFigure(l.account))}
                                    </p>
                                </div>
                                <div className="relative w-[44%] max-w-[180px] shrink-0">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-ink font-medium">Rp</span>
                                    <Input
                                        id={inputId}
                                        type="text"
                                        inputMode="numeric"
                                        placeholder={credit ? 'Owed now' : 'Actual'}
                                        aria-label={`${l.account.name}: ${credit ? 'owed now' : 'actual balance'}`}
                                        value={formatCurrencyInput(l.raw)}
                                        onChange={e => setTyped(t => ({ ...t, [l.account.id]: e.target.value.replace(/\D/g, '') }))}
                                        disabled={saving}
                                        className="pl-9 h-10 rounded-[12px] border-line text-[16px] lg:text-[13px] font-mono text-right"
                                    />
                                </div>
                            </div>

                            {l.counted && l.diff === 0 && (
                                <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-positive">
                                    <Check aria-hidden="true" className="w-3.5 h-3.5" /> Matches
                                </p>
                            )}

                            {l.counted && l.diff !== 0 && (
                                <div className="mt-2.5 space-y-2">
                                    <p className="text-[12px] text-muted-ink">
                                        <span className={cn('font-semibold tabular-nums', l.diff < 0 ? 'text-negative' : 'text-positive')}>
                                            {l.diff < 0 ? '−' : '+'}{formatCurrency(Math.abs(l.diff))}
                                        </span>
                                        {' '}{l.diff < 0 ? 'less' : 'more'} than recorded
                                    </p>
                                    <div role="radiogroup" aria-label={`Record ${l.account.name}'s difference as`} className="flex rounded-[12px] bg-surface-hover p-1 gap-1">
                                        {l.choices.map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                role="radio"
                                                aria-checked={l.as === c}
                                                onClick={() => setChosen(s => ({ ...s, [l.account.id]: c }))}
                                                disabled={saving}
                                                className={cn(
                                                    'flex-1 py-1.5 px-2 rounded-[9px] text-[12px] transition-colors',
                                                    l.as === c ? 'bg-raised shadow-sm text-ink font-semibold' : 'text-muted-ink font-medium'
                                                )}
                                            >
                                                {COUNT_AS_LABEL[c]}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[11.5px] text-muted-ink leading-snug">
                                        {COUNT_AS_HINT[l.as]}
                                        {!hasActivePeriod && ' Open a pay period to record it as spending or income.'}
                                    </p>
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>

            <button type="button" onClick={save} disabled={saving} className={SUBMIT_BUTTON}>
                <BusyLabel busy={saving} className="mx-auto">
                    {changes.length === 0 ? 'Done' : `Save ${changes.length} change${changes.length === 1 ? '' : 's'}`}
                </BusyLabel>
            </button>
        </div>
    )
}
