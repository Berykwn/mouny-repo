import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type AuthLayoutProps = {
    children: ReactNode
    /** Hide the phone-sized logo above the form (a page that opens with a back link instead). */
    hideMobileLogo?: boolean
}

/**
 * Signed-out pages: one calm column. On desktop a quiet panel beside it holds only the logo
 * and one sentence about what the app is for.
 */
export default function AuthLayout({ children, hideMobileLogo = false }: AuthLayoutProps) {
    return (
        <div className="min-h-[100dvh] bg-surface flex">
            <aside className="hidden lg:flex lg:flex-col w-1/2 max-w-[760px] shrink-0 bg-line-soft px-12 py-12 xl:px-[84px] xl:py-[72px]">
                <div className="flex items-center gap-3">
                    <Logo className="w-12 h-12" />
                    <span className="text-[26px] font-bold tracking-[-0.01em] text-ink">Mouny</span>
                </div>

                <div className="my-auto max-w-[620px]">
                    <p className="text-[40px] xl:text-[52px] font-semibold tracking-[-0.025em] leading-[1.15] text-ink">
                        Know what you can spend today.
                    </p>
                    <p className="mt-4 text-[17px] xl:text-[20px] leading-relaxed text-muted-ink">
                        Your pay period, bills, savings and the patterns behind them, on your phone and here.
                    </p>
                </div>

                <p className="text-[15px] text-subtle-ink tabular-nums">Mouny v{__APP_VERSION__}</p>
            </aside>

            <main className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 flex lg:items-center justify-center px-6 pt-14 pb-8 lg:p-8">
                    <div className="w-full max-w-[400px] space-y-5">
                        {!hideMobileLogo && <Logo className="lg:hidden w-[72px] h-[72px] -ml-1" />}
                        {children}
                    </div>
                </div>
                <p className="lg:hidden pb-[calc(env(safe-area-inset-bottom)+20px)] text-center text-[13px] text-subtle-ink">
                    Accounts are created by your admin.
                </p>
            </main>
        </div>
    )
}

function Logo({ className }: { className?: string }) {
    return <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Mouny" className={cn('shrink-0', className)} />
}

interface AuthHeadingProps {
    /** Kept for older callers; no longer shown, the title says enough. */
    eyebrow?: string
    title: string
    description: string
}

/** The title and one-line explanation that open every auth page. */
export function AuthHeading({ title, description }: AuthHeadingProps) {
    return (
        <div className="space-y-1.5">
            <h1 className="text-[30px] lg:text-[34px] font-semibold tracking-[-0.02em] leading-tight text-ink">{title}</h1>
            <p className="text-[15px] text-muted-ink leading-relaxed">{description}</p>
        </div>
    )
}

const NOTICE_TINT = {
    positive: 'text-brand',
    negative: 'text-negative',
}

interface AuthNoticeProps {
    icon: LucideIcon
    tone: keyof typeof NOTICE_TINT
    title: string
    children: ReactNode
    /** A follow-up, e.g. "Send again". */
    action?: { label: string; onClick: () => void; disabled?: boolean }
}

/** A result next to (or instead of) the form: a sent link, an expired one. */
export function AuthNotice({ icon: Icon, tone, title, children, action }: AuthNoticeProps) {
    return (
        <div className="flex items-start gap-3 rounded-[16px] bg-line-soft p-4">
            <span className={cn('w-8 h-8 rounded-full bg-surface flex items-center justify-center shrink-0', NOTICE_TINT[tone])}>
                <Icon className="w-4 h-4" strokeWidth={1.9} />
            </span>
            <div className="min-w-0 pt-1">
                <p className="text-[14px] leading-snug text-muted-ink">
                    <span className="font-semibold text-ink">{title}.</span> {children}
                </p>
                {action && (
                    <button
                        type="button"
                        onClick={action.onClick}
                        disabled={action.disabled}
                        className="mt-2 text-[14px] font-semibold text-brand-ink hover:text-brand transition-colors disabled:opacity-50"
                    >
                        {action.label}
                    </button>
                )}
            </div>
        </div>
    )
}
