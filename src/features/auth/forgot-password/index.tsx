import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { ForgotPasswordForm } from '../components/forgot-password-form'
import AuthLayout, { AuthHeading } from '@/components/layouts/auth-layout'

export default function ForgotPasswordPage() {
    return (
        <AuthLayout hideMobileLogo>
            <Link to="/login" aria-label="Back to sign in" className="-ml-2 w-10 h-10 rounded-full flex items-center justify-center text-ink hover:bg-line-soft transition-colors">
                <ChevronLeft aria-hidden="true" className="w-5 h-5" />
            </Link>
            <AuthHeading
                title="Reset your password"
                description="We’ll email you a link to set a new one."
            />

            <ForgotPasswordForm />
        </AuthLayout>
    )
}
