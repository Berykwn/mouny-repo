import { WishTile } from './wish-tile'

// Starting points that each pick up a matching icon; tapping one prefills the form.
const SUGGESTIONS = ['New laptop', 'Holiday trip', 'Emas 10 gram', 'Emergency fund', 'New phone', 'Sneakers']

interface WishEmptyProps {
    onAdd: (name?: string) => void
    disabled?: boolean
}

export function WishEmpty({ onAdd, disabled }: WishEmptyProps) {
    return (
        <div className="card p-6 text-center">
            <div className="flex justify-center -space-x-2">
                {SUGGESTIONS.slice(0, 4).map((name, i) => (
                    <WishTile
                        key={name}
                        name={name}
                        className="w-11 h-11 rounded-[14px] ring-4 ring-white"
                        iconClassName={i % 2 ? 'w-6 h-6' : 'w-[22px] h-[22px]'}
                    />
                ))}
            </div>
            <p className="mt-4 text-[16px] font-medium tracking-[-0.01em] text-ink">What are you saving toward?</p>
            <p className="mt-1 text-[12px] text-muted-ink leading-relaxed max-w-[300px] mx-auto">
                Add a wish and its price. Mouny tracks what you’ve put aside and, from what you usually have left over each period, when you can have it.
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map(name => (
                    <button
                        key={name}
                        type="button"
                        disabled={disabled}
                        onClick={() => onAdd(name)}
                        className="px-3 py-1.5 rounded-full text-[12px] font-medium border border-line bg-white text-ink hover:bg-surface-soft transition-colors disabled:opacity-50"
                    >
                        + {name}
                    </button>
                ))}
            </div>

            <button
                type="button"
                disabled={disabled}
                onClick={() => onAdd()}
                className="mt-4 text-[12px] font-medium text-brand hover:underline disabled:opacity-50"
            >
                Or start from scratch
            </button>
        </div>
    )
}
