import AuthLayout, { AuthHeading } from '@/components/layouts/auth-layout'
import { LoginForm } from '../components/login-form'

export default function LoginPage() {
    return (
        <AuthLayout>
            <AuthHeading
                title="Welcome back"
                description="Sign in to see what you can spend today."
            />

            <LoginForm />
        </AuthLayout>
    )
}
