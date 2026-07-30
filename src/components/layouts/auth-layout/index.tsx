import { AppLogo } from '@/components/app-logo'
import { ReactNode } from 'react'

type AuthLayoutProps = {
    children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="min-h-[100dvh] bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-5">

                <div className="flex items-center gap-2 justify-center">
                    <div className="w-9 h-9 flex items-center justify-center shrink-0">
                        <AppLogo />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[20px] font-semibold tracking-[-0.02em] leading-none text-[#252525] dark:text-white">Mouny.</span>
                        <span className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84]">mindful money</span>
                    </div>
                </div>

                <div className="rounded-[20px] border border-[#e5e5e5] bg-white p-6 space-y-6">
                    {children}
                </div>
            </div>
        </div>
    )
}