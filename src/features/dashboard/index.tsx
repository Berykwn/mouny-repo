import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarDays, LayoutDashboard, Tag, Wallet } from 'lucide-react'
import { OverviewTab } from './components/overview/overview-tab'
import { PeriodTab } from './components/periods/period-tab'
import { AccountTab } from './components/accounts/account-tab'
import { CategoryTab } from './components/categories/category-tab'

export default function DashboardPage() {
    return (
        <div className="px-4 pt-1.5 pb-4">
            <Tabs defaultValue="overview">
                <TabsList variant="default" className="w-full">
                    <TabsTrigger value="overview"><LayoutDashboard />Overview</TabsTrigger>
                    <TabsTrigger value="period"><CalendarDays />Periods</TabsTrigger>
                    <TabsTrigger value="account"><Wallet />Accounts</TabsTrigger>
                    <TabsTrigger value="category"><Tag />Categories</TabsTrigger>
                </TabsList>

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
            </Tabs>
        </div>
    )
}