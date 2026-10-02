import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { FIELD_INPUT, FIELD_LABEL, SUBMIT_BUTTON } from './auth-styles'

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

            toast.success('Password updated successfully!')
            navigate('/', { replace: true })
        } catch (err: unknown) {
            if (err instanceof Error) {
                const msg = err.message

                if (msg.includes('Password should be')) {
                    toast.error('Password must be at least 6 characters.')
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
                <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={loading}
                    minLength={6}
                    className={FIELD_INPUT}
                />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="confirm" className={FIELD_LABEL}>Confirm password</Label>
                <Input
                    id="confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    disabled={loading}
                    minLength={6}
                    className={FIELD_INPUT}
                />
            </div>

            <button type="submit" className={SUBMIT_BUTTON} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save new password'}
            </button>
        </form>
    )
}
