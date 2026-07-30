import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
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
            <div className="space-y-4">
                <div className="rounded-[20px] border border-[#cfdcb8] bg-[#f2f6ea] p-4 flex items-start gap-3">
                    <MailCheck className="w-4 h-4 mt-0.5 shrink-0 text-[#4d7a1d]" />
                    <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#252525]">Check your email</p>
                        <p className="text-[11.5px] text-[#4d7a1d] mt-0.5 leading-relaxed">
                            A reset link has been sent to <span className="font-medium">{email}</span>.
                        </p>
                    </div>
                </div>
                <Link
                    to="/login"
                    className="flex items-center justify-center gap-1 text-[12px] text-[#8a8a84] hover:text-[#252525] transition-colors"
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
                <Label htmlFor="email" className="text-[13px] font-medium text-[#252525]">Email</Label>
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

            <Button
                type="submit"
                className="w-full bg-[#6FA82B] hover:bg-[#6FA82B]/90 text-white"
                disabled={loading}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send reset link'}
            </Button>

            <div className="text-center">
                <Link
                    to="/login"
                    className="inline-flex items-center gap-1 text-[12px] text-[#8a8a84] hover:text-[#252525] transition-colors"
                >
                    <ArrowLeft className="w-3 h-3" />
                    Back to login
                </Link>
            </div>
        </form>
    )
}