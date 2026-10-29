import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { useAccounts, useCategories } from '@/queries'
import { categoriesService } from '@/services/accounts-categories.service'
import { BottomDrawer } from '@/components/bottom-drawer'
import { BusyLabel } from '@/components/busy-label'
import { cn } from '@/lib/utils'
import { firstStepsState, type FirstStep } from './lib/first-steps'

// Only new users ever open it, so everyone else's Home doesn't load it.
const AccountForm = lazy(() => import('@/features/accounts/components/account-form').then(m => ({ default: m.AccountForm })))

const PRIMARY = 'h-10 px-4 rounded-[12px] text-[13px] font-semibold text-on-action bg-action hover:bg-action/90 transition-colors inline-flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none'
const SECONDARY = 'h-10 px-4 rounded-[12px] text-[13px] font-semibold text-ink border border-line hover:bg-surface-hover transition-colors inline-flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none'

interface FirstStepsProps {
    onOpenPeriod: () => void
}

/**
 * A new user's Home: three steps to a first period. Each step is done when its data
 * exists, so there's nothing to remember or dismiss, and anyone with a period never sees it.
 */
export function FirstSteps({ onOpenPeriod }: FirstStepsProps) {
    const accountsQuery = useAccounts()
    const categoriesQuery = useCategories()
    const [addAccount, setAddAccount] = useState(false)
    const [seeding, setSeeding] = useState(false)
    const loading = accountsQuery.isPending || categoriesQuery.isPending
    const state = firstStepsState(accountsQuery.data ?? [], categoriesQuery.data ?? [])

    const seed = async () => {
        setSeeding(true)
        const { error } = await categoriesService.seedDefaults()
        setSeeding(false)
        if (error) { toast.error(error); return }
        toast.success('Categories added. Change them any time in Settings.')
    }

    const action = (step: FirstStep) => {
        const primary = step === state.current
        switch (step) {
            case 'accounts':
                return (
                    <button type="button" onClick={() => setAddAccount(true)} className={primary ? PRIMARY : SECONDARY}>
                        {state.accounts.length ? 'Add another' : 'Add an account'}
                    </button>
                )
            case 'categories':
                return state.categories.length ? (
                    <Link to="/category" className={SECONDARY}>Review them</Link>
                ) : (
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => void seed()} disabled={seeding} className={primary ? PRIMARY : SECONDARY}>
                            <BusyLabel busy={seeding}>Add the usual ones</BusyLabel>
                        </button>
                        <Link to="/category" className="h-10 px-2 inline-flex items-center text-[13px] font-medium text-muted-ink hover:text-ink transition-colors">
                            Make my own
                        </Link>
                    </div>
                )
            case 'period':
                return (
                    <button type="button" onClick={onOpenPeriod} disabled={!state.accounts.length} className={primary ? PRIMARY : SECONDARY}>
                        Open a period
                    </button>
                )
        }
    }

    const steps: { key: FirstStep; title: string; body: string; done: string | null }[] = [
        {
            key: 'accounts',
            title: 'Add where your money is',
            body: 'Bank accounts, e-wallets and cash, with what each holds today.',
            done: state.accounts.length ? state.accounts.map(a => a.name).join(', ') : null,
        },
        {
            key: 'categories',
            title: 'Choose your categories',
            body: 'Start with a ready set (food, transport, bills…) or make your own. You can change them later.',
            done: state.categories.length ? `${state.categories.length} categories` : null,
        },
        {
            key: 'period',
            title: 'Open your first period',
            body: state.accounts.length
                ? 'From this payday to the next. Mouny then works out what you can spend each day.'
                : 'From this payday to the next. Add an account first, so the pay has somewhere to land.',
            done: null,
        },
    ]

    return (
        <section aria-labelledby="first-steps-title" className="pt-2">
            <div className="flex items-baseline justify-between gap-3">
                <h2 id="first-steps-title" className="text-[17px] font-semibold text-ink">Get set up</h2>
                {!loading && <span className="text-[13px] text-subtle-ink tabular-nums">{state.doneCount} of 3 done</span>}
            </div>
            <p className="mt-1 text-[13.5px] text-muted-ink">Three steps, a couple of minutes. Nothing is filled in for you.</p>

            <ol className="mt-4 space-y-3">
                {steps.map((step, i) => {
                    const done = !!step.done
                    const current = step.key === state.current
                    return (
                        <li
                            key={step.key}
                            aria-current={current ? 'step' : undefined}
                            className={cn('card p-4 flex gap-3.5', current && 'ring-1 ring-brand/40')}
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[12.5px] font-semibold tabular-nums',
                                    done ? 'bg-brand text-on-brand' : current ? 'bg-brand-tint text-brand-ink' : 'bg-line-soft text-subtle-ink',
                                )}
                            >
                                {done ? <Check className="w-4 h-4" strokeWidth={2.5} /> : i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                                <h3 className={cn('text-[15px] font-semibold', done ? 'text-muted-ink' : 'text-ink')}>
                                    {step.title}
                                    {done && <span className="sr-only"> (done)</span>}
                                </h3>
                                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-ink line-clamp-2">
                                    {done ? step.done : step.body}
                                </p>
                                {!loading && <div className="mt-3">{action(step.key)}</div>}
                            </div>
                        </li>
                    )
                })}
            </ol>

            <BottomDrawer open={addAccount} onClose={() => setAddAccount(false)} title="Add account">
                <Suspense fallback={null}>
                    <AccountForm onSuccess={() => setAddAccount(false)} />
                </Suspense>
            </BottomDrawer>
        </section>
    )
}
