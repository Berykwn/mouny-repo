import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export function ForgotPasswordForm() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
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
            <div className="space-y-4 text-center">
                <div className="text-sm text-muted-foreground bg-muted rounded-md px-4 py-3">
                    A password reset link has been sent to{' '}
                    <span className="font-medium text-foreground">{email}</span>.
                    Please check your inbox.
                </div>
                <Link
                    to="/login"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-3 h-3" />
                    Back to login
                </Link>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="people@mouny.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={loading}
                />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
            </Button>

            <div className="text-center">
                <Link
                    to="/login"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-3 h-3" />
                    Back to login
                </Link>
            </div>
        </form>
    )
}