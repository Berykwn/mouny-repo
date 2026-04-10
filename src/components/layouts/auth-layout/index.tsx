import { AppLogo } from '@/components/app-logo'
import { ReactNode } from 'react'

type AuthLayoutProps = {
    children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-8">

                <div className="flex items-center gap-x-2">
                    <div className="w-12 h-12 flex items-center justify-center">
                        <AppLogo />
                    </div>
                    <div className='flex flex-col'>
                        <h1 className="font-semibold tracking-tight">
                            Mouny.
                        </h1>
                        <span className="text-xs text-muted-foreground">
                            by raremind studio
                        </span>
                    </div>
                </div>

                {children}
            </div>
        </div>
    )
}