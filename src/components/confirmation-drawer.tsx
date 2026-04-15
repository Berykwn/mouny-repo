import { BottomDrawer } from '@/components/bottom-drawer'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

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
                <div className="flex gap-x-4 items-center py-3">
                    <AlertTriangle className="text-yellow-500 mt-0.5" />
                    <p className="text-yellow-500 text-sm">
                        {description}
                    </p>
                </div>

                <Button
                    className="w-full"
                    variant={destructive ? 'destructive' : 'default'}
                    onClick={onConfirm}
                    disabled={loading}
                >
                    {confirmLabel}
                </Button>

                <Button
                    className="w-full"
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