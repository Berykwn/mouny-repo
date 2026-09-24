export function calculateHealthScore({
    totalIncome,
    totalExpense,
    totalBalance,
    totalDebt,
    expenseDiffPct,
}: {
    totalIncome: number
    totalExpense: number
    totalBalance: number
    totalDebt: number
    expenseDiffPct: number | null
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
        const savingsRate = (totalIncome - totalExpense) / totalIncome
        const savingsPct = Math.round(savingsRate * 100)
        if (savingsRate < 0) { score -= 50; periodReasons.push('Overspent budget') }
        else if (savingsRate < 0.1) { score -= 30; periodReasons.push(`Savings rate only ${savingsPct}%`) }
        else if (savingsRate < 0.2) { score -= 15; periodReasons.push(`Savings rate ${savingsPct}%`) }
        else if (savingsRate < 0.3) { score -= 5; periodReasons.push(`Savings rate ${savingsPct}%`) }
        else periodReasons.push(`Savings rate ${savingsPct}%`)
    }

    if (totalBalance > 0) {
        const debtRatio = totalDebt / totalBalance
        if (debtRatio > 1) { score -= 30; overallReasons.push('Debt exceeds balance') }
        else if (debtRatio > 0.5) { score -= 20; overallReasons.push('High debt load') }
        else if (debtRatio > 0.3) { score -= 10; overallReasons.push('Moderate debt load') }
        else if (debtRatio > 0.1) { score -= 5; overallReasons.push('Low debt load') }
        else overallReasons.push('No significant debt')
    } else {
        overallReasons.push('No debt')
    }

    if (expenseDiffPct !== null) {
        if (expenseDiffPct > 50) { score -= 20; periodReasons.push(`Expense up ${expenseDiffPct}% vs last`) }
        else if (expenseDiffPct > 20) { score -= 10; periodReasons.push(`Expense up ${expenseDiffPct}% vs last`) }
        else if (expenseDiffPct > 0) { score -= 5; periodReasons.push(`Expense up ${expenseDiffPct}% vs last`) }
        else if (expenseDiffPct < 0) periodReasons.push(`Expense down ${Math.abs(expenseDiffPct)}% vs last`)
        else periodReasons.push('Expense same as last period')
    }

    const clamped = Math.max(0, Math.min(100, score))
    const label =
        clamped >= 80 ? 'Excellent' :
            clamped >= 60 ? 'Good' :
                clamped >= 40 ? 'Fair' : 'Poor'

    return { score: clamped, label, periodReasons, overallReasons }
}
