import type { ElementType, SVGProps } from 'react'
import { cn } from '@/lib/utils'
import { ICON_MAP } from '@/lib/icon-map'
import LaptopIcon from '~icons/ph/laptop-duotone'
import PhoneIcon from '~icons/ph/device-mobile-duotone'
import MotorcycleIcon from '~icons/ph/motorcycle-duotone'
import CarIcon from '~icons/ph/car-duotone'
import HouseIcon from '~icons/ph/house-duotone'
import PlaneIcon from '~icons/ph/airplane-duotone'
import CoinsIcon from '~icons/ph/coins-duotone'
import CameraIcon from '~icons/ph/camera-duotone'
import GameIcon from '~icons/ph/game-controller-duotone'
import WatchIcon from '~icons/ph/watch-duotone'
import SneakerIcon from '~icons/ph/sneaker-duotone'
import TvIcon from '~icons/ph/television-duotone'
import HeadphonesIcon from '~icons/ph/headphones-duotone'
import CouchIcon from '~icons/ph/couch-duotone'
import DiamondIcon from '~icons/ph/diamond-duotone'
import GradIcon from '~icons/ph/graduation-cap-duotone'
import BabyIcon from '~icons/ph/baby-duotone'
import BikeIcon from '~icons/ph/bicycle-duotone'
import PiggyIcon from '~icons/ph/piggy-bank-duotone'
import GiftIcon from '~icons/ph/gift-duotone'
import ShirtIcon from '~icons/ph/t-shirt-duotone'
import BagIcon from '~icons/ph/handbag-duotone'
import MonitorIcon from '~icons/ph/monitor-duotone'
import TrendIcon from '~icons/ph/trend-up-duotone'
import SparkleIcon from '~icons/ph/sparkle-duotone'

type Icon = ElementType<SVGProps<SVGSVGElement>>

// Wishes have no icon field, so the name picks one (English and Indonesian words).
// First match wins, so the more specific words come first.
const KEYWORD_ICONS: [RegExp, Icon][] = [
    [/\b(jam tangan|watch|smartwatch|arloji)\b/, WatchIcon],
    [/\b(laptop|macbook|notebook|chromebook)\b/, LaptopIcon],
    [/\b(hp|handphone|iphone|phone|smartphone|samsung|pixel|ponsel)\b/, PhoneIcon],
    [/\b(motor|motorcycle|vespa|nmax|scooter|skuter)\b/, MotorcycleIcon],
    [/\b(mobil|car)\b/, CarIcon],
    [/\b(rumah|house|home|kpr|apartemen|apartment|dp rumah)\b/, HouseIcon],
    [/\b(liburan|travel|trip|holiday|vacation|tiket|flight|umroh|umrah|haji)\b/, PlaneIcon],
    [/\b(emas|gold|logam mulia|antam|perak|silver)\b/, CoinsIcon],
    [/\b(kamera|camera|lensa|lens|drone)\b/, CameraIcon],
    [/\b(ps5|ps4|playstation|nintendo|switch|xbox|game|console|konsol)\b/, GameIcon],
    [/\b(sepatu|shoes?|sneakers?)\b/, SneakerIcon],
    [/\b(tv|televisi|television)\b/, TvIcon],
    [/\b(headphones?|earphones?|airpods|headset|tws|speaker)\b/, HeadphonesIcon],
    [/\b(sofa|kursi|meja|furniture|couch|kasur|lemari)\b/, CouchIcon],
    [/\b(nikah|wedding|cincin|ring|lamaran|perhiasan)\b/, DiamondIcon],
    [/\b(kuliah|sekolah|course|kursus|education|pendidikan|bootcamp|sertifikasi)\b/, GradIcon],
    [/\b(bayi|baby|anak|lahiran)\b/, BabyIcon],
    [/\b(sepeda|bike|bicycle)\b/, BikeIcon],
    [/\b(dana darurat|emergency|tabungan|savings?|pensiun)\b/, PiggyIcon],
    [/\b(hadiah|gift|kado)\b/, GiftIcon],
    [/\b(baju|shirt|pakaian|clothes|jaket|jacket|dress)\b/, ShirtIcon],
    [/\b(tas|bag|handbag|backpack|ransel)\b/, BagIcon],
    [/\b(monitor|pc|komputer|computer|keyboard|ipad|tablet)\b/, MonitorIcon],
    [/\b(investasi|saham|reksa|crypto|kripto|obligasi)\b/, TrendIcon],
]

/** The icon to draw and a stable key for it, which also picks the tint. */
function resolveIcon(name: string, icon?: string | null): { Icon: Icon; key: string } {
    if (icon && ICON_MAP[icon]) return { Icon: ICON_MAP[icon], key: icon }
    const n = name.toLowerCase()
    const index = KEYWORD_ICONS.findIndex(([re]) => re.test(n))
    return index >= 0
        ? { Icon: KEYWORD_ICONS[index][1], key: `auto-${index}` }
        : { Icon: SparkleIcon, key: 'auto' }
}

// Soft plate + saturated icon pairs. The tint follows the icon (like a category's color),
// not the wish's id — a new wish has no id yet, and typing its name must not recolor it.
const TINTS: [string, string][] = [
    ['#6FA82B1f', '#4d7a1d'],
    ['#3d6eb61f', '#3d6eb6'],
    ['#8b5cf61f', '#7c3aed'],
    ['#ec48991f', '#db2777'],
    ['#f59e0b24', '#b45309'],
    ['#14b8a61f', '#0f766e'],
]

function tintFor(seed: string): [string, string] {
    let h = 0
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
    return TINTS[Math.abs(h) % TINTS.length]
}

interface WishTileProps {
    name: string
    /** The user's pick from the category icon set; replaces the name-matched icon. */
    icon?: string | null
    className?: string
    iconClassName?: string
}

export function WishTile({ name, icon, className, iconClassName }: WishTileProps) {
    const { Icon, key } = resolveIcon(name, icon)
    const [bg, fg] = tintFor(key)
    return (
        <div
            className={cn('w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0', className)}
            style={{ backgroundColor: bg, color: fg }}
        >
            <Icon className={cn('w-[22px] h-[22px]', iconClassName)} />
        </div>
    )
}
