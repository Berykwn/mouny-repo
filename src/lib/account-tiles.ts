// Tile tints derived from each icon's main color (card gray, cash green, piggy pink, wallet teal).
// The bank tile stays gray, not red, so it doesn't read as the savings pink.
export const ACCOUNT_TILE_CLASS: Record<string, string> = {
    bank: 'bg-[#8E979F]/20',
    cash: 'bg-[#6FBF73]/20',
}
export const SAVINGS_TILE_CLASS = 'bg-[#f28b8b]/20'
export const WALLET_TILE_CLASS = 'bg-[#45AAB8]/20'
