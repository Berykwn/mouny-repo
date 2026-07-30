import { BottomDrawer } from '@/components/bottom-drawer'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDrawerProps {
    open: boolean
    title: string
    description: string
    confirmLabel?: string
    onConfirm: () => void
    onClose: () => void
    loading?: boolean
    destructive?: boolean
}

export function ConfirmDrawer({
    open,
    title,
    description,
    confirmLabel = 'Delete',
    onConfirm,
    onClose,
    loading = false,
    destructive = true,
}: ConfirmDrawerProps) {
    return (
        <BottomDrawer open={open} onClose={onClose} title={title}>
            <div className="space-y-4 pb-2">
                <div className={cn(
                    'flex items-start gap-3 rounded-[14px] border px-4 py-4',
                    destructive ? 'bg-[#fef2f2] border-[#f3c5c5]' : 'bg-[#f4f4f2] border-[#e5e5e5]'
                )}>
                    <AlertTriangle className={cn('w-4 h-4 shrink-0 mt-0.5', destructive ? 'text-[#dc2626]' : 'text-[#8a8a84]')} />
                    <p className={cn('text-[13px]', destructive ? 'text-[#dc2626]' : 'text-[#252525]')}>{description}</p>
                </div>

                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={loading}
                    className={cn(
                        'w-full h-12 rounded-[14px] text-[13px] font-semibold text-white transition-colors disabled:opacity-50 disabled:pointer-events-none',
                        destructive ? 'bg-[#dc2626] hover:bg-[#dc2626]/90' : 'bg-[#6FA82B] hover:bg-[#6FA82B]/90'
                    )}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : confirmLabel}
                </button>

                <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="w-full h-12 rounded-[14px] text-[13px] font-semibold border border-[#e5e5e5] text-[#252525] hover:bg-[#f4f4f2] transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                    Cancel
                </button>
            </div>
        </BottomDrawer>
    )
}