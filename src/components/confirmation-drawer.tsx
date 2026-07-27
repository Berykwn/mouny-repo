import { BottomDrawer } from '@/components/bottom-drawer'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'

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
                <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-4 py-4.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">{description}</p>
                </div>

                <Button
                    className="w-full h-12 rounded-xl text-sm font-semibold"
                    variant={destructive ? 'destructive' : 'default'}
                    onClick={onConfirm}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
                </Button>

                <Button
                    className="w-full h-12 rounded-xl text-sm font-semibold"
                    variant="outline"
                    onClick={onClose}
                    disabled={loading}
                >
                    Cancel
                </Button>
            </div>
        </BottomDrawer>
    )
}