import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { CreditCard, ShoppingBag, Tag, History, LogOut, ChevronRight, CalendarCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ConfirmDrawer } from '@/components/confirmation-drawer'
import { BottomDrawer } from '@/components/bottom-drawer'
import { ClosePeriodForm } from '@/features/periods/components/close-period-form'
import { payPeriodsService } from '@/services/pay-periods.service'
import type { PayPeriod } from '@/types'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'

const MONEY_ITEMS = [
    { to: '/debts', label: 'Debts', icon: CreditCard },
    { to: '/wish-list', label: 'Wishlist', icon: ShoppingBag },
]

const SETTINGS_ITEMS = [
    { to: '/category', label: 'Categories', icon: Tag },
    { to: '/period-history', label: 'Period History', icon: History },
]

const ROW = 'flex items-center gap-3 px-4 py-3.5 text-[13px] font-medium text-[#252525] hover:bg-[#fbfbfa] transition-colors'

export default function MenuPage() {
    const navigate = useNavigate()
    const [logoutConfirm, setLogoutConfirm] = useState(false)
    const [activePeriod, setActivePeriod] = useState<PayPeriod | null>(null)
    const [closePeriodDrawer, setClosePeriodDrawer] = useState(false)

    useEffect(() => {
        payPeriodsService.getActive().then(({ data }) => setActivePeriod(data))
    }, [])

    async function handleLogout() {
        setLogoutConfirm(false)
        await supabase.auth.signOut()
        navigate('/login', { replace: true })
    }

    return (
        <>
            <PageHeader title="Menu" />
            <section className="px-4 pb-4 space-y-4">
                <div className="lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start space-y-4 lg:space-y-0">
                    <div>
                        <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84] px-1 mb-1.5">Money</p>
                        <nav className="rounded-[20px] border border-[#e5e5e5] bg-white overflow-hidden">
                            {MONEY_ITEMS.map(({ to, label, icon: Icon }, i) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    className={cn(ROW, i > 0 && 'border-t border-[#f2f2f0]')}
                                >
                                    <Icon className="w-4 h-4 text-[#8a8a84] shrink-0" strokeWidth={1.75} />
                                    <span className="flex-1">{label}</span>
                                    <ChevronRight className="w-4 h-4 text-[#c4c4be]" />
                                </NavLink>
                            ))}
                        </nav>
                    </div>

                    <div>
                        <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84] px-1 mb-1.5">Settings</p>
                        <nav className="rounded-[20px] border border-[#e5e5e5] bg-white overflow-hidden">
                            {SETTINGS_ITEMS.map(({ to, label, icon: Icon }, i) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    className={cn(ROW, i > 0 && 'border-t border-[#f2f2f0]')}
                                >
                                    <Icon className="w-4 h-4 text-[#8a8a84] shrink-0" strokeWidth={1.75} />
                                    <span className="flex-1">{label}</span>
                                    <ChevronRight className="w-4 h-4 text-[#c4c4be]" />
                                </NavLink>
                            ))}

                            {activePeriod && (
                                <button
                                    onClick={() => setClosePeriodDrawer(true)}
                                    className={cn(ROW, 'w-full border-t border-[#f2f2f0]')}
                                >
                                    <CalendarCheck className="w-4 h-4 text-[#8a8a84] shrink-0" strokeWidth={1.75} />
                                    <span className="flex-1 text-left">Close Period</span>
                                    <ChevronRight className="w-4 h-4 text-[#c4c4be]" />
                                </button>
                            )}
                        </nav>
                    </div>
                </div>

                <button
                    onClick={() => setLogoutConfirm(true)}
                    className="w-full flex items-center gap-3 rounded-[20px] border border-[#f3c5c5] bg-[#fef2f2] px-4 py-3.5 text-[13px] font-medium text-[#dc2626] transition-colors"
                >
                    <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                    Logout
                </button>

                <BottomDrawer
                    open={closePeriodDrawer}
                    onClose={() => setClosePeriodDrawer(false)}
                    title="Close Period"
                >
                    {activePeriod && (
                        <ClosePeriodForm
                            period={activePeriod}
                            onSuccess={() => { setClosePeriodDrawer(false); setActivePeriod(null) }}
                        />
                    )}
                </BottomDrawer>

                <ConfirmDrawer
                    open={logoutConfirm}
                    title="Logout"
                    description="Are you sure you want to logout?"
                    confirmLabel="Logout"
                    loading={false}
                    onConfirm={handleLogout}
                    onClose={() => setLogoutConfirm(false)}
                />
            </section>
        </>
    )
}
