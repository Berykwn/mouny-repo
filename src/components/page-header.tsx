import type { ReactNode } from 'react'

interface PageHeaderProps {
    title: string
    action?: ReactNode
}

export function PageHeader({ title, action }: PageHeaderProps) {
    return (
        <header className="flex items-center justify-between px-4 pt-[22px] pb-2.5">
            <span className="text-[20px] font-semibold tracking-[-0.02em] text-[#252525] dark:text-white">
                {title}
            </span>
            {action}
        </header>
    )
}
