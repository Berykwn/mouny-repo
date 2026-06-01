import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-6">
            <p className="text-6xl font-bold text-muted-foreground/20">404</p>
            <div className="space-y-1">
                <h1 className="text-xl font-semibold">Page not found</h1>
                <p className="text-sm text-muted-foreground">
                    The page you are looking for does not exist or has been moved.
                </p>
            </div>
            <Button asChild variant="outline">
                <Link to="/">Back to Dashboard</Link>
            </Button>
        </div>
    )
}