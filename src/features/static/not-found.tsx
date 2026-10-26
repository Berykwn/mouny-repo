import { Link } from 'react-router-dom'
import { House } from 'lucide-react'

export default function NotFoundPage() {
    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center text-center p-6 bg-surface">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="w-[72px] h-[72px]" />
            <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.01em] text-ink">This page doesn’t exist</h1>
            <p className="mt-1.5 text-[14px] text-muted-ink">The link may be old, or the page moved.</p>
            <Link
                to="/"
                className="mt-5 h-11 px-5 rounded-[12px] text-[14px] font-semibold text-on-action bg-action hover:bg-action/90 transition-colors flex items-center justify-center gap-2"
            >
                <House className="w-4 h-4" />
                Go to Home
            </Link>
        </div>
    )
}
