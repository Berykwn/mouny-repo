import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { FIELD_LABEL, SUBMIT_BUTTON } from './auth-styles'
import { PasswordInput } from './password-input'

const MIN_LENGTH = 6

export function ResetPasswordForm() {
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirm) {
            toast.error('Passwords do not match.')
            return
        }

        setLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error

            toast.success('Password updated.')
            navigate('/', { replace: true })
        } catch (err: unknown) {
            if (err instanceof Error) {
                const msg = err.message

                if (msg.includes('Password should be')) {
                    toast.error(`Password must be at least ${MIN_LENGTH} characters.`)
                } else {
                    toast.error(msg)
                }
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
                <Label htmlFor="password" className={FIELD_LABEL}>New password</Label>
                <PasswordInput
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={loading}
                    minLength={MIN_LENGTH}
                    aria-describedby="password-hint"
                />
                <p id="password-hint" className="text-[13px] text-subtle-ink">At least {MIN_LENGTH} characters.</p>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="confirm" className={FIELD_LABEL}>Confirm password</Label>
                <PasswordInput
                    id="confirm"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={loading}
                    minLength={MIN_LENGTH}
                />
            </div>

            <button type="submit" className={SUBMIT_BUTTON} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save and sign in'}
            </button>
        </form>
    )
}
