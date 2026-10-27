import { useEffect, useState } from 'react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { CategoryGrid } from '@/components/category-grid'
import { useCategories } from '@/queries'
import type { Category, TransactionType } from '@/types'
import { BusyLabel } from '@/components/busy-label'

const NO_CATEGORIES: Category[] = []

interface BulkCategoryDrawerProps {
    open: boolean
    onClose: () => void
    type: TransactionType | null
    loading?: boolean
    onConfirm: (categoryId: string) => void
}

export function BulkCategoryDrawer({ open, onClose, type, loading, onConfirm }: BulkCategoryDrawerProps) {
    const { data } = useCategories(type)
    const categories = (type && data) || NO_CATEGORIES
    const [selectedCategoryId, setSelectedCategoryId] = useState('')

    useEffect(() => {
        if (open) setSelectedCategoryId('')
    }, [open, type])

    return (
        <BottomDrawer open={open} onClose={onClose} title="Change Category">
            <CategoryGrid
                categories={categories}
                selectedId={selectedCategoryId}
                onSelect={(c) => setSelectedCategoryId(c.id)}
                disabled={loading}
            />
            <button
                type="button"
                disabled={!selectedCategoryId || loading}
                onClick={() => onConfirm(selectedCategoryId)}
                className="mt-4 w-full h-12 rounded-[14px] text-[13px] font-semibold text-on-action bg-action hover:bg-action/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
                <BusyLabel busy={loading} className="mx-auto">Apply</BusyLabel>
            </button>
        </BottomDrawer>
    )
}
