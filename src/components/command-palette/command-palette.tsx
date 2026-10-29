import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import {
    Search, Plus, House, List, ChartLine, CalendarRange, Receipt, CreditCard, ShoppingBag, Wallet, Tag,
    History, Settings, CalendarCheck, CalendarPlus, Moon, Sun, Monitor, type LucideIcon,
} from 'lucide-react'
import { useBills, useCategories, useDebts, usePeriods } from '@/queries'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { CategoryIcon } from '@/features/categories/components/category-icon'
import { CATEGORY_KIND_META, resolveCategoryKind } from '@/lib/category-kind'
import { formatCurrency } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import { searchPalette, type PaletteItem } from './palette-search'
import { Kbd } from './kbd'

interface CommandItem extends PaletteItem {
    icon: ReactNode
    run: () => void
}

interface CommandPaletteProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onNewTransaction: () => void
}

const icon = (Icon: LucideIcon) => <Icon className="w-[18px] h-[18px]" strokeWidth={1.9} />

const PAGES: { label: string; to: string; icon: LucideIcon; keywords?: string[] }[] = [
    { label: 'Home', to: '/', icon: House, keywords: ['dashboard', 'safe to spend'] },
    { label: 'Ledger', to: '/transactions', icon: List, keywords: ['transactions', 'history'] },
    { label: 'Insights', to: '/insights', icon: ChartLine, keywords: ['reports', 'analytics'] },
    { label: 'Plan', to: '/plan', icon: CalendarRange, keywords: ['upcoming'] },
    { label: 'Bills', to: '/bills', icon: Receipt, keywords: ['subscriptions'] },
    { label: 'Debts', to: '/debts', icon: CreditCard, keywords: ['receivables', 'loans'] },
    { label: 'Wishlist', to: '/wish-list', icon: ShoppingBag, keywords: ['wishes', 'goals'] },
    { label: 'Accounts', to: '/accounts', icon: Wallet, keywords: ['balances', 'banks', 'wallets'] },
    { label: 'Categories', to: '/category', icon: Tag, keywords: ['budgets'] },
    { label: 'Periods', to: '/period-history', icon: History, keywords: ['pay periods', 'history'] },
    { label: 'Settings', to: '/menu', icon: Settings, keywords: ['appearance', 'notifications', 'export', 'log out'] },
]

const THEMES: { value: Theme; label: string; icon: LucideIcon }[] = [
    { value: 'dark', label: 'Use the dark theme', icon: Moon },
    { value: 'light', label: 'Use the light theme', icon: Sun },
    { value: 'system', label: 'Follow the device theme', icon: Monitor },
]

/**
 * ⌘K: one box that finds pages, categories, bills and debts by name and runs the common
 * actions, all from the keyboard. Arrows move, Enter opens, Escape closes.
 */
export function CommandPalette({ open, onOpenChange, onNewTransaction }: CommandPaletteProps) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
                <Dialog.Content
                    aria-describedby={undefined}
                    // What a command opens (a drawer, a page) takes focus; going back to the trigger would steal it.
                    onCloseAutoFocus={e => e.preventDefault()}
                    className={cn(
                        'fixed left-1/2 top-[12vh] z-50 w-[calc(100%-32px)] max-w-[620px] -translate-x-1/2',
                        'rounded-[16px] border border-line bg-surface shadow-[0_30px_80px_-20px_rgba(0,0,0,.45)] overflow-hidden outline-none',
                        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]',
                    )}
                >
                    <Dialog.Title className="sr-only">Search and commands</Dialog.Title>
                    {/* Mounted only while open, so each opening starts from an empty box. */}
                    {open && <PaletteBody onDone={() => onOpenChange(false)} onNewTransaction={onNewTransaction} />}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}

function PaletteBody({ onDone, onNewTransaction }: { onDone: () => void; onNewTransaction: () => void }) {
    const navigate = useNavigate()
    const { theme, setTheme } = useTheme()
    const { activePeriod } = usePeriods()
    const { data: categories } = useCategories()
    const { data: bills } = useBills()
    const { data: debts } = useDebts({ activeOnly: true })
    const [query, setQuery] = useState('')
    const [cursor, setCursor] = useState(0)
    const listRef = useRef<HTMLDivElement>(null)

    const items = useMemo((): CommandItem[] => {
        const go = (to: string, state?: object) => () => navigate(to, state ? { state } : undefined)
        const list: CommandItem[] = [
            { id: 'new-tx', group: 'Actions', label: 'New transaction', hint: 'N', keywords: ['add', 'expense', 'income', 'record'], icon: icon(Plus), run: onNewTransaction },
            activePeriod
                ? { id: 'close-period', group: 'Actions', label: 'Close this period', hint: 'Periods', keywords: ['payday', 'end'], icon: icon(CalendarCheck), run: go('/period-history', { close: true }) }
                : { id: 'open-period', group: 'Actions', label: 'Open a period', hint: 'Periods', keywords: ['payday', 'start', 'salary'], icon: icon(CalendarPlus), run: go('/period-history', { open: true }) },
            { id: 'add-account', group: 'Actions', label: 'Add an account', hint: 'Accounts', keywords: ['bank', 'wallet', 'cash'], icon: icon(Wallet), run: go('/accounts', { add: true }) },
            { id: 'add-category', group: 'Actions', label: 'Add a category', hint: 'Categories', keywords: ['budget'], icon: icon(Tag), run: go('/category', { add: true }) },
            ...THEMES.filter(t => t.value !== theme).map((t): CommandItem => ({
                id: `theme-${t.value}`, group: 'Actions', label: t.label, hint: 'Appearance', keywords: ['theme', 'appearance', 'mode'], icon: icon(t.icon), run: () => setTheme(t.value),
            })),
            ...PAGES.map((p): CommandItem => ({ id: `page-${p.to}`, group: 'Pages', label: p.label, keywords: p.keywords, icon: icon(p.icon), run: go(p.to) })),
        ]
        for (const c of categories ?? []) {
            list.push({
                id: `cat-${c.id}`,
                group: 'Categories',
                label: c.name,
                hint: c.type === 'income' ? 'Income' : CATEGORY_KIND_META[resolveCategoryKind(c)].label,
                icon: <CategoryIcon name={c.icon} className="w-[18px] h-[18px]" style={{ color: c.color ?? undefined }} />,
                run: go('/category', { categoryId: c.id }),
            })
        }
        for (const b of bills ?? []) {
            list.push({
                id: `bill-${b.id}`,
                group: 'Bills',
                label: b.name,
                hint: `${formatCurrency(b.amount)} · day ${b.due_day}${b.paused ? ' · paused' : ''}`,
                icon: icon(Receipt),
                run: go('/bills', { billId: b.id }),
            })
        }
        for (const d of debts ?? []) {
            list.push({
                id: `debt-${d.id}`,
                group: 'Debts',
                label: d.counterparty,
                hint: `${formatCurrency(d.remaining_amount)} ${d.type === 'debt' ? 'you owe' : 'owed to you'}`,
                icon: icon(CreditCard),
                run: go('/debts', { debtId: d.id }),
            })
        }
        return list
    }, [navigate, onNewTransaction, activePeriod, categories, bills, debts, theme, setTheme])

    const sections = useMemo(() => searchPalette(items, query), [items, query])
    const flat = useMemo(() => sections.flatMap(s => s.items), [sections])
    const active = Math.min(cursor, Math.max(0, flat.length - 1))

    useEffect(() => {
        listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
    }, [active, query])

    const runItem = (item: CommandItem | undefined) => {
        if (!item) return
        onDone()
        item.run()
    }

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => (Math.min(c, flat.length - 1) + 1) % Math.max(1, flat.length)) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => (Math.min(c, flat.length - 1) - 1 + flat.length) % Math.max(1, flat.length)) }
        else if (e.key === 'Enter') { e.preventDefault(); runItem(flat[active]) }
    }

    let index = -1
    return (
        <>
            <div className="flex items-center gap-2.5 h-[58px] px-[18px] border-b border-line">
                <Search className="w-[18px] h-[18px] text-muted-ink shrink-0" />
                <input
                    autoFocus
                    value={query}
                    onChange={e => { setQuery(e.target.value); setCursor(0) }}
                    onKeyDown={onKeyDown}
                    placeholder="Search pages, categories, bills, debts…"
                    aria-label="Search"
                    aria-controls="command-palette-list"
                    aria-activedescendant={flat[active] ? `cmd-${flat[active].id}` : undefined}
                    className="flex-1 min-w-0 bg-transparent text-[16px] text-ink placeholder:text-subtle-ink outline-none"
                />
                <Kbd>esc</Kbd>
            </div>

            <div ref={listRef} id="command-palette-list" role="listbox" className="max-h-[min(420px,55vh)] overflow-y-auto py-1.5">
                {sections.length === 0 ? (
                    <p className="px-[18px] py-6 text-center text-[13.5px] text-muted-ink">Nothing matches “{query.trim()}”.</p>
                ) : sections.map(section => (
                    <div key={section.group} role="group" aria-label={section.group}>
                        <p className="px-[18px] pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[.08em] text-subtle-ink">{section.group}</p>
                        {section.items.map(item => {
                            index++
                            const i = index
                            const isActive = i === active
                            return (
                                <div
                                    key={item.id}
                                    id={`cmd-${item.id}`}
                                    role="option"
                                    aria-selected={isActive}
                                    data-active={isActive}
                                    onMouseMove={() => { if (!isActive) setCursor(i) }}
                                    onClick={() => runItem(item)}
                                    className={cn(
                                        'flex items-center gap-3 h-11 px-[18px] cursor-pointer text-[14.5px] text-ink',
                                        isActive && 'bg-brand-tint',
                                    )}
                                >
                                    <span className={cn('shrink-0', isActive ? 'text-brand-ink' : 'text-muted-ink')}>{item.icon}</span>
                                    <span className="flex-1 min-w-0 truncate">{item.label}</span>
                                    {item.hint && <span className="shrink-0 text-[12.5px] text-subtle-ink tabular-nums">{item.hint}</span>}
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-[18px] px-[18px] py-3 border-t border-line text-[12px] text-subtle-ink">
                <span className="flex items-center gap-1.5"><Kbd>↑↓</Kbd> move</span>
                <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> open</span>
                <span className="flex items-center gap-1.5"><Kbd>N</Kbd> new transaction</span>
                <span className="flex items-center gap-1.5"><Kbd>G</Kbd> then <Kbd>L</Kbd> Ledger</span>
            </div>
        </>
    )
}
