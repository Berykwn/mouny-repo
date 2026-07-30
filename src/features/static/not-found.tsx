import { Link } from 'react-router-dom'

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-6">
            <p className="text-[64px] font-medium tracking-[-0.02em] leading-none text-[#e5e5e5]">404</p>
            <div className="space-y-1">
                <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#252525]">Page not found</h1>
                <p className="text-[13px] text-[#8a8a84]">
                    The page you are looking for does not exist or has been moved.
                </p>
            </div>
            <Link
                to="/"
                className="h-12 px-6 rounded-[14px] text-[13px] font-semibold text-white bg-[#6FA82B] hover:bg-[#6FA82B]/90 transition-colors flex items-center justify-center"
            >
                Back to Dashboard
            </Link>
        </div>
    )
}
