import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    ArrowLeftRight,
    CreditCard,
    ShoppingBag,
    LogOut,
    TrendingUp,
    Menu,
    X,
} from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/transactions', label: 'Transaksi', icon: ArrowLeftRight },
    { to: '/debts', label: 'Hutang', icon: CreditCard },
    { to: '/wish-list', label: 'Wish List', icon: ShoppingBag },
]

export default function AppLayout() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/login', { replace: true })
    }

    return (
        <div className="min-h-screen bg-background flex">

            <aside className="hidden lg:flex flex-col w-56 border-r bg-card shrink-0 fixed inset-y-0 left-0 z-20">
                {/* Logo */}
                <div className="flex items-center gap-2 px-5 h-14 border-b shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
                        <TrendingUp className="w-3.5 h-3.5 text-background" />
                    </div>
                    <span className="font-semibold text-sm tracking-tight">MoneyMind</span>
                </div>

                {/* Nav links */}
                <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
                    {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                                    isActive
                                        ? 'bg-foreground text-background font-medium'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                )
                            }
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div className="border-t p-3 shrink-0">
                    <div className="px-3 py-2 mb-1">
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors w-full"
                    >
                        <LogOut className="w-4 h-4 shrink-0" />
                        Keluar
                    </button>
                </div>
            </aside>

            <header className="lg:hidden fixed top-0 inset-x-0 z-20 h-14 border-b bg-background/80 backdrop-blur flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
                        <TrendingUp className="w-3.5 h-3.5 text-background" />
                    </div>
                    <span className="font-semibold text-sm tracking-tight">MoneyMind</span>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setMobileMenuOpen((v) => !v)}
                >
                    {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </Button>
            </header>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-x-0 top-14 z-10 border-b bg-background shadow-sm">
                    <nav className="px-4 py-3 space-y-0.5">
                        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                onClick={() => setMobileMenuOpen(false)}
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                                        isActive
                                            ? 'bg-foreground text-background font-medium'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                    )
                                }
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                {label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="border-t px-4 py-3 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{user?.email}</p>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Keluar
                        </button>
                    </div>
                </div>
            )}

            <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 border-t bg-background/80 backdrop-blur h-16 flex items-center">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            cn(
                                'flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors',
                                isActive
                                    ? 'text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={cn(
                                    'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                                    isActive ? 'bg-foreground' : 'bg-transparent'
                                )}>
                                    <Icon className={cn('w-4 h-4', isActive ? 'text-background' : '')} />
                                </div>
                                <span className="text-[10px]">{label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <main className={cn(
                'flex-1 min-h-screen',
                'lg:ml-56',
                'pt-14 lg:pt-0',
                'pb-16 lg:pb-0',
            )}>
                <Outlet />
            </main>
        </div>
    )
}