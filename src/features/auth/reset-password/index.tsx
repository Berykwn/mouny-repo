import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AlertCircle } from 'lucide-react'
import { ResetPasswordForm } from '../components/reset-password-form'
import AuthLayout from '@/components/layouts/auth-layout'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    // Supabase redirect from email contains token in URL hash
    // onAuthStateChange will fire 'PASSWORD_RECOVERY' event
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
  }, [navigate])

  return (
    <AuthLayout>
      {checking ? (
        <div className="space-y-1">
          <div className="h-5 w-40 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>
      ) : validSession ? (
        <>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Create a new password</h1>
            <p className="text-sm text-muted-foreground">
              Enter a new password for your account.
            </p>
          </div>
          <ResetPasswordForm />
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-4 py-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">Invalid or expired link</p>
              <p className="text-destructive/80">
                Request a new password reset link from the forgot password page.
              </p>
            </div>
          </div>
          <a
            href="/forgot-password"
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
          >
            Request a new link
          </a>
        </div>
      )}
    </AuthLayout>
  )
}