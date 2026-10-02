import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { AuthNotice } from '@/components/layouts/auth-layout'
import { FIELD_INPUT, FIELD_LABEL, QUIET_LINK, SUBMIT_BUTTON } from './auth-styles'

export function ForgotPasswordForm() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                // Respect the deploy base path (e.g. /mouny/) and hash routing.
                redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}${import.meta.env.VITE_USE_HASH_ROUTE === 'true' ? '#/' : ''}reset-password`,
            })

            if (error) throw error
            toast.success('Reset link sent! Check your email.')
            setSent(true)
        } catch (err: unknown) {
            if (err instanceof Error) {
                toast.error(err.message)
            }
        } finally {
            setLoading(false)
        }
    }

    if (sent) {
        return (
            <div className="space-y-4">
                <AuthNotice icon={MailCheck} tone="positive" title="Check your email">
                    A reset link has been sent to <span className="font-medium text-ink">{email}</span>.
                </AuthNotice>
                <div className="text-center">
                    <Link to="/login" className={QUIET_LINK}>
                        <ArrowLeft className="w-3 h-3" />
                        Back to login
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
                <Label htmlFor="email" className={FIELD_LABEL}>Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="people@mouny.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={loading}
                    className={FIELD_INPUT}
                />
            </div>

            <button type="submit" className={SUBMIT_BUTTON} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send reset link'}
            </button>

            <div className="text-center">
                <Link to="/login" className={QUIET_LINK}>
                    <ArrowLeft className="w-3 h-3" />
                    Back to login
                </Link>
            </div>
        </form>
    )
}