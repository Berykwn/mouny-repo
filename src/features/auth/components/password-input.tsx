import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { FIELD_INPUT } from './auth-styles'

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'>

/** A password field with a show/hide toggle, so a typo on a phone keyboard can be checked. */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
    const [shown, setShown] = useState(false)
    return (
        <div className="relative">
            <Input {...props} type={shown ? 'text' : 'password'} className={cn(FIELD_INPUT, 'pr-12', className)} />
            <button
                type="button"
                onClick={() => setShown(s => !s)}
                aria-label={shown ? 'Hide password' : 'Show password'}
                aria-pressed={shown}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-[10px] flex items-center justify-center text-subtle-ink hover:text-ink transition-colors"
            >
                {shown ? <EyeOff aria-hidden="true" className="w-[18px] h-[18px]" /> : <Eye aria-hidden="true" className="w-[18px] h-[18px]" />}
            </button>
        </div>
    )
}
