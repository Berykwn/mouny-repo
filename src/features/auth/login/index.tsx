import AuthLayout from '@/components/layouts/auth-layout'
import { LoginForm } from '../components/login-form'

export default function LoginPage() {
    return (
        <AuthLayout>
            <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84]">Sign in</p>
                <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#252525]">
                    Welcome back!
                </h1>
                <p className="text-[13px] text-[#8a8a84] leading-relaxed">
                    Enter your email and password to sign in to your account.
                </p>
            </div>

            <LoginForm />
        </AuthLayout>
    )
}