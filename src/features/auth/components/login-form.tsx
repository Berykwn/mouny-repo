import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-[13px] font-medium text-[#252525]">Password</Label>
                    <Link
                        to="/forgot-password"
                        className="text-[11.5px] text-[#8a8a84] hover:text-[#252525] transition-colors"
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
                />
            </div>

            <Button
                type="submit"
                className="w-full bg-[#6FA82B] hover:bg-[#6FA82B]/90 text-white"
                disabled={loading}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
            </Button>
        </form>
    )
}