import { Link } from 'react-router-dom'
import { Mascot } from '@/components/mascot'
import { useAuth } from '@/hooks/use-auth'
import { firstName, greeting } from '@/lib/greeting'

/**
 * A small hello above the numbers: the time of day and the user's name. On a phone the
 * header's logo sits right above, so the mascot only joins on desktop.
 */
export function HomeGreeting() {
    const { user } = useAuth()
    const name = firstName(user)

    return (
        <div className="flex items-center gap-2.5">
            <Mascot className="hidden lg:block w-8 h-8 -rotate-6" />
            <div className="min-w-0">
                <h1 className="text-[20px] lg:text-[22px] font-semibold tracking-[-0.02em] text-ink truncate">
                    {greeting()}{name ? `, ${name}` : ''}
                </h1>
                {!name && (
                    <Link to="/menu" state={{ editName: true }} className="text-[13px] font-medium text-brand-ink hover:text-brand">
                        What should Mouny call you?
                    </Link>
                )}
            </div>
        </div>
    )
}
