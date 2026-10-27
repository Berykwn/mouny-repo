import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'
import { AuthNotice } from '@/components/layouts/auth-layout'
import { FIELD_INPUT, FIELD_LABEL, SUBMIT_BUTTON } from './auth-styles'
import { BusyLabel } from '@/components/busy-label'

export function ForgotPasswordForm() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    // The address the last link went to; the form stays, so a typo can be fixed and sent again.
    const [sentTo, setSentTo] = useState<string | null>(null)

    const send = async () => {
        setLoading(true)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                // Respect the deploy base path (e.g. /mouny/) and hash routing.
                redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}${import.meta.env.VITE_USE_HASH_ROUTE === 'true' ? '#/' : ''}reset-password`,
            })

            if (error) throw error
            setSentTo(email)
        } catch (err: unknown) {
            if (err instanceof Error) {
                toast.error(err.message)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        void send()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
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
                <BusyLabel busy={loading}>Send reset link</BusyLabel>
            </button>

            {sentTo && (
                <div role="status">
                    <AuthNotice
                        icon={Mail}
                        tone="positive"
                        title="Check your email"
                        action={sentTo === email ? { label: 'Send again', onClick: () => void send(), disabled: loading } : undefined}
                    >
                        A link is on its way to {sentTo}. Nothing there? Look in spam.
                    </AuthNotice>
                </div>
            )}
        </form>
    )
}
