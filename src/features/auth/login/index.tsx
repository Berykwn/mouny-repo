import AuthLayout, { AuthHeading } from '@/components/layouts/auth-layout'
import { LoginForm } from '../components/login-form'

export default function LoginPage() {
    return (
        <AuthLayout>
            <AuthHeading
                eyebrow="Sign in"
                title="Welcome back!"
                description="Enter your email and password to sign in to your account."
            />

            <LoginForm />
        </AuthLayout>
    )
}
