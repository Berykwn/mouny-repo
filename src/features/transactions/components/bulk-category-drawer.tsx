import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { BottomDrawer } from '@/components/bottom-drawer'
import { CategoryGrid } from '@/components/category-grid'
import { categoriesService } from '@/services/accounts-categories.service'
import type { Category, TransactionType } from '@/types'

interface BulkCategoryDrawerProps {
    open: boolean
    onClose: () => void
    type: TransactionType | null
    loading?: boolean
    onConfirm: (categoryId: string) => void
}

export function BulkCategoryDrawer({ open, onClose, type, loading, onConfirm }: BulkCategoryDrawerProps) {
    const [categories, setCategories] = useState<Category[]>([])
    const [selectedCategoryId, setSelectedCategoryId] = useState('')

    useEffect(() => {
        if (!open || !type) return
        setSelectedCategoryId('')
        categoriesService.getByType(type).then(({ data }) => setCategories(data ?? []))
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
                className="mt-4 w-full h-12 rounded-[14px] text-[13px] font-semibold text-white bg-[#6FA82B] hover:bg-[#6FA82B]/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Apply'}
            </button>
        </BottomDrawer>
    )
}
