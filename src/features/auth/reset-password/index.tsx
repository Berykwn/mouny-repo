import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AlertCircle } from 'lucide-react'
import { ResetPasswordForm } from '../components/reset-password-form'
import AuthLayout from '@/components/layouts/auth-layout'
import { Skeleton } from '@/components/ui/skeleton'

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
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      ) : validSession ? (
        <>
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-[.14em] text-[#8a8a84]">Password reset</p>
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#252525]">Create a new password</h1>
            <p className="text-[13px] text-[#8a8a84] leading-relaxed">
              Enter a new password for your account.
            </p>
          </div>
          <ResetPasswordForm />
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[20px] border border-[#f3c5c5] bg-[#fef2f2] p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#dc2626]" />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[#252525]">Invalid or expired link</p>
              <p className="text-[11.5px] text-[#dc2626] mt-0.5 leading-relaxed">
                Request a new password reset link from the forgot password page.
              </p>
            </div>
          </div>
          <Link
            to="/forgot-password"
            className="flex items-center justify-center text-[12px] text-[#8a8a84] hover:text-[#252525] underline-offset-4 hover:underline transition-colors"
          >
            Request a new link
          </Link>
        </div>
      )}
    </AuthLayout>
  )
}