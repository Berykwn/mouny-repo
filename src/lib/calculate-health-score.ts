export function calculateHealthScore({
    totalIncome,
    totalSpending,
    totalBalance,
    totalDebt,
    expenseDiffPct,
    projected = false,
}: {
    totalIncome: number
    /** Expenses minus savings — savings transactions raise the rate, they don't lower it. */
    totalSpending: number
    totalBalance: number
    totalDebt: number
    expenseDiffPct: number | null
    /** totalSpending is where the current pace ends the period, not what's spent so far. */
    projected?: boolean
}): {
    score: number
    label: 'Poor' | 'Fair' | 'Good' | 'Excellent'
    periodReasons: string[]
    overallReasons: string[]
} {
    let score = 100
    const periodReasons: string[] = []
    const overallReasons: string[] = []

    if (totalIncome > 0) {
        const unspentRate = (totalIncome - totalSpending) / totalIncome
        const pct = `${Math.round(unspentRate * 100)}% of income unspent`
        const unspent = projected ? `On pace for ${pct}` : pct
        if (unspentRate < 0) {
            score -= 50
            periodReasons.push(projected ? 'On pace to spend more than income' : 'Spent more than income')
        }
        else if (unspentRate < 0.1) { score -= 30; periodReasons.push(projected ? `On pace for only ${pct}` : `Only ${pct}`) }
        else if (unspentRate < 0.2) { score -= 15; periodReasons.push(unspent) }
        else if (unspentRate < 0.3) { score -= 5; periodReasons.push(unspent) }
        else periodReasons.push(unspent)
    } else if (totalSpending > 0) {
        // Spending with no income to cover it is the worst case, not a skipped check.
        score -= 50
        periodReasons.push('Spending with no income')
    }

    if (totalDebt <= 0) {
        overallReasons.push('No debt')
    } else if (totalBalance <= 0) {
        score -= 30
        overallReasons.push('Debt exceeds balance')
    } else {
        const debtRatio = totalDebt / totalBalance
        if (debtRatio > 1) { score -= 30; overallReasons.push('Debt exceeds balance') }
        else if (debtRatio > 0.5) { score -= 20; overallReasons.push('High debt load') }
        else if (debtRatio > 0.3) { score -= 10; overallReasons.push('Moderate debt load') }
        else if (debtRatio > 0.1) { score -= 5; overallReasons.push('Low debt load') }
        else overallReasons.push('No significant debt')
    }

    if (expenseDiffPct !== null) {
        const spending = projected ? 'Spending on pace for' : 'Spending'
        if (expenseDiffPct > 50) { score -= 20; periodReasons.push(`${spending} +${expenseDiffPct}% vs last`) }
        else if (expenseDiffPct > 20) { score -= 10; periodReasons.push(`${spending} +${expenseDiffPct}% vs last`) }
        else if (expenseDiffPct > 0) { score -= 5; periodReasons.push(`${spending} +${expenseDiffPct}% vs last`) }
        else if (expenseDiffPct < 0) periodReasons.push(`${spending} ${expenseDiffPct}% vs last`)
        else periodReasons.push(`${spending} level with last`)
    }

    const clamped = Math.max(0, Math.min(100, score))
    const label =
        clamped >= 80 ? 'Excellent' :
            clamped >= 60 ? 'Good' :
                clamped >= 40 ? 'Fair' : 'Poor'

    return { score: clamped, label, periodReasons, overallReasons }
}
