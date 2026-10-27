import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
    title: string
    action?: ReactNode
    /**
     * A page opened from another one (Accounts from Home, Categories from Settings) gets a
     * back chevron: it goes back in history, or to this path when the page was opened directly.
     */
    back?: string
}

export function PageHeader({ title, action, back }: PageHeaderProps) {
    const navigate = useNavigate()

    if (back) {
        const goBack = () => {
            // React Router numbers its history entries; 0 means this tab started here.
            const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
            if (idx > 0) navigate(-1)
            else navigate(back)
        }
        return (
            <header className="lg:hidden flex items-center gap-2 px-4 pt-[18px] pb-2">
                <button
                    type="button"
                    onClick={goBack}
                    aria-label="Back"
                    className="-ml-2 w-10 h-10 rounded-full flex items-center justify-center text-ink hover:bg-line-soft transition-colors"
                >
                    <ChevronLeft aria-hidden="true" className="w-6 h-6" />
                </button>
                <h1 className="flex-1 min-w-0 text-[26px] font-semibold tracking-[-0.02em] text-ink truncate">{title}</h1>
                {action}
            </header>
        )
    }

    return (
        <header className="lg:hidden flex items-center justify-between px-4 pt-[22px] pb-2.5">
            <h1 className="min-w-0 text-[26px] font-semibold tracking-[-0.02em] text-ink truncate">{title}</h1>
            {action}
        </header>
    )
}
