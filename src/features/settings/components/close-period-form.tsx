import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, Loader2, AlertTriangleIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { payPeriodsService } from '@/services/pay-periods.service'
import { accountsService } from '@/services/accounts-categories.service'
import { formatCurrency, toISODate } from '@/lib/helpers'
import { toast } from 'sonner'
import type { PayPeriod } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface ClosePeriodFormProps {
    period: PayPeriod
    onSuccess: () => void
}

export function ClosePeriodForm({ period, onSuccess }: ClosePeriodFormProps) {
    const [endDate, setEndDate] = useState<Date | undefined>(new Date())
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

        const { error } = await payPeriodsService.close(
            period.id,
            closingBalance,
            toISODate(endDate)
        )

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
                <Card>
                    <CardHeader className="border-b">
                        <CardTitle>
                            <div className="flex gap-x-4 items-center">
                                <AlertTriangleIcon className="text-yellow-500 mt-0.5" />
                                <p className="text-yellow-500 text-sm">
                                    This action cannot be undone.
                                </p>
                            </div>
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Start date</span>
                            <span className="font-medium">{period.start_date}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Salary</span>
                            <span className="font-medium">
                                {formatCurrency(period.salary_amount)}
                            </span>
                        </div>

                        <Separator className='my-6' />

                        <div className="space-y-1.5">
                            <Label>Closing date*</Label>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'w-full justify-start text-left font-normal',
                                            !endDate && 'text-muted-foreground'
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate
                                            ? format(endDate, 'yyyy-MM-dd')
                                            : 'Pick a date'}
                                    </Button>
                                </PopoverTrigger>

                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={endDate}
                                        onSelect={(date) => setEndDate(date)}
                                        disabled={(date) =>
                                            date < new Date(period.start_date)
                                        }
                                    />
                                </PopoverContent>
                            </Popover>
                            <span className="text-xs text-muted-foreground">
                                Defaults to today if empty.
                            </span>
                        </div>
                    </CardContent>
                </Card>

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