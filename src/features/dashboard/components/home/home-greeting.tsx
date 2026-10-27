import { Link } from 'react-router-dom'
import { Mascot } from '@/components/mascot'
import { useAuth } from '@/hooks/use-auth'
import { firstName, greeting } from '@/lib/greeting'

/** A small hello above the numbers: the mascot, the time of day, and the user's name. */
export function HomeGreeting() {
    const { user } = useAuth()
    const name = firstName(user)

    return (
        <div className="flex items-center gap-2.5">
            <Mascot className="w-7 h-7 -rotate-6" />
            <p className="min-w-0 truncate text-[15px] text-muted-ink">
                {greeting()}
                {name
                    ? <>, <span className="font-semibold text-ink">{name}</span></>
                    : <>. <Link to="/menu" className="font-medium text-brand-ink hover:text-brand">What should we call you?</Link></>}
            </p>
        </div>
    )
}
