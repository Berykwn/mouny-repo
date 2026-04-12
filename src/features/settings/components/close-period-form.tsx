import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertTriangleIcon } from 'lucide-react'
import { payPeriodsService } from '@/services/pay-periods.service'
import { accountsService } from '@/services/accounts-categories.service'
import { formatCurrency, toISODate } from '@/lib/helpers'
import { toast } from 'sonner'
import type { PayPeriod } from '@/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ClosePeriodFormProps {
    period: PayPeriod
    onSuccess: () => void
}

export function ClosePeriodForm({ period, onSuccess }: ClosePeriodFormProps) {
    const [endDate, setEndDate] = useState(toISODate())
    const [loading, setLoading] = useState(false)
    const [confirmed, setConfirmed] = useState(false)

    const handleClose = async () => {
        if (!endDate) {
            toast.error('Closing date is required.')
            return
        }

        setLoading(true)

        const { data: accounts } = await accountsService.getAll()
        const closingBalance = (accounts ?? []).reduce((s, a) => s + a.balance, 0)

        const { error } = await payPeriodsService.close(period.id, closingBalance, endDate)

        setLoading(false)

        if (error) {
            toast.error(error)
            return
        }

        toast.success('Pay period closed successfully.')
        onSuccess()
    }

    if (!confirmed) {
        return (
            <div className="space-y-4 pb-2">
                <Alert className="max-w-md border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
                    <AlertTriangleIcon />
                    <AlertTitle>Close this period?</AlertTitle>
                    <AlertDescription>
                        Once closed, you cannot add new transactions to this period.
                        Current balance will be saved as closing balance.
                    </AlertDescription>
                </Alert>

                <div className="rounded-lg border bg-card p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Start date</span>
                        <span className="font-medium">{period.start_date}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Salary</span>
                        <span className="font-medium">{formatCurrency(period.salary_amount)}</span>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label>Closing date</Label>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={period.start_date}
                    />
                </div>

                <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setConfirmed(true)}
                >
                    Yes, close this period
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-4 pb-2">
            <p className="text-sm text-muted-foreground">
                Closing balance will be calculated automatically from all your accounts.
            </p>

            <Button
                variant="destructive"
                className="w-full"
                onClick={handleClose}
                disabled={loading}
            >
                {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : 'Confirm Close Period'}
            </Button>

            <Button
                variant="outline"
                className="w-full"
                onClick={() => setConfirmed(false)}
                disabled={loading}
            >
                Cancel
            </Button>
        </div>
    )
}