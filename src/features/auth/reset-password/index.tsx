import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AlertCircle } from 'lucide-react'
import { ResetPasswordForm } from '../components/reset-password-form'
import AuthLayout, { AuthHeading, AuthNotice } from '@/components/layouts/auth-layout'
import { QUIET_LINK } from '../components/auth-styles'
import { Skeleton } from '@/components/ui/skeleton'

export default function ResetPasswordPage() {
  const [checking, setChecking] = useState(true)
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    // Supabase redirect from email contains token in URL hash
    // onAuthStateChange will fire 'PASSWORD_RECOVERY' event
    // The token is removed from the URL once read, so after a reload no
    // PASSWORD_RECOVERY event comes — an existing session is enough to set a password.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidSession(true)
        setChecking(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true)
        setChecking(false)
      } else if (event === 'SIGNED_IN') {
        // If already has an active session without recovery, redirect to dashboard
        setChecking(false)
      }
    })

    // Fallback: if no event within 3 seconds, assume token is invalid
    const timeout = setTimeout(() => {
      setChecking(false)
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  return (
    <AuthLayout>
      {checking ? (
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      ) : validSession ? (
        <>
          <AuthHeading
            eyebrow="Password reset"
            title="Create a new password"
            description="Enter a new password for your account."
          />
          <ResetPasswordForm />
        </>
      ) : (
        <div className="space-y-4">
          <AuthNotice icon={AlertCircle} tone="negative" title="Invalid or expired link">
            Request a new password reset link from the forgot password page.
          </AuthNotice>
          <div className="text-center">
            <Link to="/forgot-password" className={QUIET_LINK}>
              Request a new link
            </Link>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}