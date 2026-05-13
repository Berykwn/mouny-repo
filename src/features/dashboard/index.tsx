import { useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarDays, LayoutDashboard, Tag, Wallet } from 'lucide-react'
import { OverviewTab } from './components/overview/overview-tab'
import { PeriodTab } from './components/periods/period-tab'
import { AccountTab } from './components/accounts/account-tab'
import { CategoryTab } from './components/categories/category-tab'

const TABS = ['overview', 'period', 'account', 'category'] as const
type Tab = typeof TABS[number]

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState<Tab>('overview')

    const handlers = useSwipeable({
        onSwipedLeft: () => {
            const i = TABS.indexOf(activeTab)
            if (i < TABS.length - 1) setActiveTab(TABS[i + 1])
        },
        onSwipedRight: () => {
            const i = TABS.indexOf(activeTab)
            if (i > 0) setActiveTab(TABS[i - 1])
        },
        preventScrollOnSwipe: true,
        trackMouse: false,
        delta: 50,
    })

    return (
        <div className="px-4 pt-1.5 pb-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
                <TabsList variant="default" className="w-full">
                    <TabsTrigger value="overview"><LayoutDashboard />Overview</TabsTrigger>
                    <TabsTrigger value="period"><CalendarDays />Periods</TabsTrigger>
                    <TabsTrigger value="account"><Wallet />Accounts</TabsTrigger>
                    <TabsTrigger value="category"><Tag />Categories</TabsTrigger>
                </TabsList>

                <div {...handlers}>
                    <TabsContent value="overview">
                        <OverviewTab />
                    </TabsContent>

                    <TabsContent value="period">
                        <PeriodTab />
                    </TabsContent>

                    <TabsContent value="account">
                        <AccountTab />
                    </TabsContent>

                    <TabsContent value="category">
                        <CategoryTab />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}