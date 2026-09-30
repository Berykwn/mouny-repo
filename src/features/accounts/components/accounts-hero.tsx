import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { HeroAction, HeroGlow } from '@/components/hero'
import type { AccountShare } from '../lib/account-insights'

interface AccountsHeroProps {
    totalBalance: number
    accountCount: number
    shares: AccountShare[]
    runwayDays: number | null
    overdrawnCount: number
    lowCount: number
    onAdd: () => void
}

export function AccountsHero({ totalBalance, accountCount, shares, runwayDays, overdrawnCount, lowCount, onAdd }: AccountsHeroProps) {
    let message: string | null = null
    if (overdrawnCount > 0) {
        message = `${overdrawnCount} account${overdrawnCount === 1 ? ' is' : 's are'} overdrawn — move money in to cover it.`
    } else if (lowCount > 0) {
        message = `${lowCount} account${lowCount === 1 ? ' is' : 's are'} running low at this period’s pace.`
    } else if (runwayDays !== null) {
        message = `At this period’s pace, your balance covers about ${runwayDays} day${runwayDays === 1 ? '' : 's'} of spending.`
    }

    return (
        <header className="card p-5 relative overflow-hidden lg:order-2">
            <HeroGlow />
            <div className="relative flex items-center justify-between mb-4">
                <p className="text-[11px] uppercase tracking-[.14em] text-muted-ink">Total balance</p>
                <HeroAction onClick={onAdd}>Account</HeroAction>
            </div>

            {accountCount === 0 ? (
                <p className="relative text-[13px] text-muted-ink">Add your first account</p>
            ) : (
                <div className="relative">
                    <p className={cn(
                        'text-[32px] lg:text-[26px] font-medium tracking-[-0.02em] leading-none tabular-nums',
                        totalBalance < 0 ? 'text-negative' : 'text-ink'
                    )}>
                        {formatCurrency(totalBalance)}
                    </p>
                    <p className="text-[11px] text-muted-ink mt-2">
                        across {accountCount} account{accountCount > 1 ? 's' : ''}
                    </p>

                    {/* Where the money sits: one stacked bar, then a compact legend */}
                    {shares.length > 1 && (
                        <div className="mt-4">
                            <div className="flex h-1.5 gap-[2px] overflow-hidden rounded-full">
                                {shares.map(s => (
                                    <div key={s.id} className="h-full" style={{ flexGrow: s.percent, backgroundColor: s.color }} />
                                ))}
                            </div>
                            <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
                                {shares.map(s => (
                                    <div key={s.id} className="flex items-center gap-1.5 min-w-0 text-[11px]">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                        <span className="text-ink truncate">{s.name}</span>
                                        <span className="text-muted-ink tabular-nums ml-auto shrink-0">{Math.round(s.percent)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {message && (
                        <p className={cn(
                            'mt-4 pt-3 border-t border-line-soft text-[12px] leading-relaxed',
                            overdrawnCount > 0 ? 'text-negative' : lowCount > 0 ? 'text-warning' : 'text-ink'
                        )}>
                            {message}
                        </p>
                    )}
                </div>
            )}
        </header>
    )
}
