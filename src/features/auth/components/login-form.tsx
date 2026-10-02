import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { FIELD_INPUT, FIELD_LABEL, SUBMIT_BUTTON } from './auth-styles'

export function LoginForm() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) throw error

            toast.success('Login success!')
            navigate('/', { replace: true })
        } catch (err: unknown) {
            if (err instanceof Error) {
                const msg = err.message

                if (msg.includes('Invalid login credentials')) {
                    toast.error('Invalid email or password.')
                } else if (msg.includes('Email not confirmed')) {
                    toast.error('Email not confirmed. Please check your inbox.')
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

            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password" className={FIELD_LABEL}>Password</Label>
                    <Link
                        to="/forgot-password"
                        className="text-[11.5px] text-muted-ink hover:text-ink transition-colors"
                    >
                        Forgot password?
                    </Link>
                </div>
                <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    minLength={6}
                    className={FIELD_INPUT}
                />
            </div>

            <button type="submit" className={SUBMIT_BUTTON} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
            </button>
        </form>
    )
}
