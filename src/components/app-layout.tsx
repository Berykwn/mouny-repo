import { Link, NavLink, Outlet } from 'react-router-dom'
import {
    LayoutDashboard,
    ArrowLeftRight,
    CreditCard,
    ShoppingBag,
    Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppLogo } from './app-logo'
import { ModeToggle } from './mode-toggle'
// import { HeaderMenu } from './header-menu'

const NAV_ITEMS = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/debts', label: 'Debts', icon: CreditCard },
    { to: '/wish-list', label: 'Wish List', icon: ShoppingBag },
    // { to: '/settings', label: 'Settings', icon: Settings },
]

export default function AppLayout() {
    return (
        <div className="min-h-screen bg-background flex justify-center">
            {/* Mobile Container */}
            <div className="w-full max-w-md min-h-screen bg-red-50 flex flex-col border-x">

                {/* Header */}
                <header className="sticky top-0 z-20 h-14 border-b bg-background/80 backdrop-blur flex items-center justify-between px-4">
                    <div className="flex items-center gap-x-2">
                        <div className="w-10 h-10 flex items-center justify-center">
                            <AppLogo />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-sm font-semibold tracking-tight">Mouny.</h1>
                            <span className="text-xs text-muted-foreground">mindful money</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-1">
                        <ModeToggle />
                        <Link to="/settings">
                            <Settings2 className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                        </Link>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>

                <nav className="sticky bottom-0 border-t bg-background/80 backdrop-blur h-16 flex items-center">
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
                                    <div
                                        className={cn(
                                            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                                            isActive ? 'bg-neutral-200' : 'bg-transparent'
                                        )}
                                    >
                                        <Icon
                                            className={cn(
                                                'w-4 h-4',
                                                isActive ? 'text-foreground' : ''
                                            )}
                                        />
                                    </div>
                                    <span className="text-[10px]">{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </div>
    )
}