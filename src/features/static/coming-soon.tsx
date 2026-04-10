import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function ComingSoonPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-6">
            <div className="space-y-1">
                <h1 className="text-xl font-semibold">Segera hadir</h1>
                <p className="text-sm text-muted-foreground">
                    Fitur ini sedang dalam pengembangan.
                </p>
            </div>
            <Button asChild variant="outline">
                <Link to="/dashboard">Kembali ke Dashboard</Link>
            </Button>
        </div>
    )
}