import { ForgotPasswordForm } from '../components/forgot-password-form'
import AuthLayout from '@/components/layouts/auth-layout'

export default function ForgotPasswordPage() {
    return (
        <AuthLayout>
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">
                    Forgot password?
                </h1>
                <p className="text-sm text-muted-foreground">
                    Enter your email and we will send you a link to reset your password.
                </p>
            </div>

            <ForgotPasswordForm />
        </AuthLayout>
    )
}