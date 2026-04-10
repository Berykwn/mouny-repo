import AuthLayout from '@/components/layouts/auth-layout'
import { LoginForm } from '../components/login-form'

export default function LoginPage() {
    return (
        <AuthLayout>
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">
                    Welcome back!
                </h1>
                <p className="text-sm text-muted-foreground">
                    Enter your email and password to sign in to your account.
                </p>
            </div>

            <LoginForm />
        </AuthLayout>
    )
}