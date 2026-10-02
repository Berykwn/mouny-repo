import { ForgotPasswordForm } from '../components/forgot-password-form'
import AuthLayout, { AuthHeading } from '@/components/layouts/auth-layout'

export default function ForgotPasswordPage() {
    return (
        <AuthLayout>
            <AuthHeading
                eyebrow="Password reset"
                title="Forgot password?"
                description="Enter your email and we will send you a link to reset your password."
            />

            <ForgotPasswordForm />
        </AuthLayout>
    )
}
