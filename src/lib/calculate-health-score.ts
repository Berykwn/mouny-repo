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
    reasons: string[]
} {
    let score = 100
    const reasons: string[] = []

    if (totalIncome > 0) {
        const savingsRate = (totalIncome - totalExpense) / totalIncome
        const savingsPct = Math.round(savingsRate * 100)
        if (savingsRate < 0) { score -= 50; reasons.push('Overspent budget') }
        else if (savingsRate < 0.1) { score -= 30; reasons.push(`Savings rate only ${savingsPct}%`) }
        else if (savingsRate < 0.2) { score -= 15; reasons.push(`Savings rate ${savingsPct}%`) }
        else if (savingsRate < 0.3) { score -= 5; reasons.push(`Savings rate ${savingsPct}%`) }
        else reasons.push(`Savings rate ${savingsPct}%`)
    }

    if (totalBalance > 0) {
        const debtRatio = totalDebt / totalBalance
        if (debtRatio > 1) { score -= 30; reasons.push('Debt exceeds balance') }
        else if (debtRatio > 0.5) { score -= 20; reasons.push('High debt load') }
        else if (debtRatio > 0.3) { score -= 10; reasons.push('Moderate debt load') }
        else if (debtRatio > 0.1) { score -= 5; reasons.push('Low debt load') }
        else reasons.push('No significant debt')
    } else {
        reasons.push('No debt')
    }

    if (expenseDiffPct !== null) {
        if (expenseDiffPct > 50) { score -= 20; reasons.push(`Expense up ${expenseDiffPct}% vs last`) }
        else if (expenseDiffPct > 20) { score -= 10; reasons.push(`Expense up ${expenseDiffPct}% vs last`) }
        else if (expenseDiffPct > 0) { score -= 5; reasons.push(`Expense up ${expenseDiffPct}% vs last`) }
        else if (expenseDiffPct < 0) reasons.push(`Expense down ${Math.abs(expenseDiffPct)}% vs last`)
        else reasons.push('Expense same as last period')
    }

    const clamped = Math.max(0, Math.min(100, score))
    const label =
        clamped >= 80 ? 'Excellent' :
            clamped >= 60 ? 'Good' :
                clamped >= 40 ? 'Fair' : 'Poor'

    return { score: clamped, label, reasons }
}