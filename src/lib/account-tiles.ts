// Tile tints derived from each icon's main color (card gray, cash green, piggy pink, wallet teal,
// credit-card green, coins gold). The bank tile stays gray, not red, so it doesn't read as the
// savings pink.
export const WALLET_TILE_CLASS = 'bg-[#45AAB8]/20'
export const ACCOUNT_TILE_CLASS: Record<string, string> = {
    bank: 'bg-[#8E979F]/20',
    cash: 'bg-[#6FBF73]/20',
    ewallet: WALLET_TILE_CLASS,
}
export const SAVINGS_TILE_CLASS = 'bg-[#f28b8b]/20'
export const CREDIT_TILE_CLASS = 'bg-[#61C2AB]/20'
export const ASSET_TILE_CLASS = 'bg-[#E0A526]/20'
