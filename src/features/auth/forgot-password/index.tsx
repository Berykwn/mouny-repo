import { ForgotPasswordForm } from '../components/forgot-password-form'
import AuthLayout from '@/components/layouts/auth-layout'

export default function ForgotPasswordPage() {
    return (
        <AuthLayout>
            <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84]">Password reset</p>
                <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#252525]">
                    Forgot password?
                </h1>
                <p className="text-[13px] text-[#8a8a84] leading-relaxed">
                    Enter your email and we will send you a link to reset your password.
                </p>
            </div>

            <ForgotPasswordForm />
        </AuthLayout>
    )
}