import { ICON_MAP } from '@/lib/icon-map'
import { MoreHorizontal } from 'lucide-react'
import type { LucideProps } from 'lucide-react'

interface CategoryIconProps extends Omit<LucideProps, 'name'> {
    name?: string | null
}

export function CategoryIcon({ name, ...props }: CategoryIconProps) {
    const Icon = (name && ICON_MAP[name]) ? ICON_MAP[name] : MoreHorizontal
    return <Icon {...props} />
}