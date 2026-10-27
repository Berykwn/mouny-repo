import { NavLink } from 'react-router-dom'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TINT } from './tint'

export interface RowProps {
    to: string
    icon: LucideIcon
    tint: keyof typeof TINT
    label: string
    sub: string
    flag?: { text: string; className: string } | null
}

export function Row({ to, icon: Icon, tint, label, sub, flag }: RowProps) {
    return (
        <NavLink to={to} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-soft transition-colors">
            <span className={cn('w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0', TINT[tint])}>
                <Icon className="w-4 h-4" strokeWidth={1.9} />
            </span>
            <span className="flex-1 min-w-0">
                <span className="block text-[15px] text-ink">{label}</span>
                <span className="block text-[13px] text-subtle-ink truncate">{sub}</span>
            </span>
            {flag && (
                <span className={cn('text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0', flag.className)}>{flag.text}</span>
            )}
            <ChevronRight className="w-4 h-4 text-faint-ink shrink-0" />
        </NavLink>
    )
}
