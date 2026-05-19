import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Building2, TrendingUp, CheckSquare, AlertCircle } from 'lucide-react'
import { getDashboardStats, getWorkspaceId } from '@/lib/db/queries'
import { formatDistanceToNow } from 'date-fns'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const workspaceId = await getWorkspaceId(session.user.id)
  if (!workspaceId) redirect('/register')

  const stats = await getDashboardStats(workspaceId, session.user.id)

  const statCards = [
    { label: 'Contacts', value: stats.contacts, icon: Users, color: 'text-blue-500' },
    { label: 'Accounts', value: stats.companies, icon: Building2, color: 'text-purple-500' },
    { label: 'Open Deals', value: `$${stats.pipelineValue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-500', sub: `${stats.openDeals} deals` },
    { label: 'Overdue Tasks', value: stats.overdueTasks, icon: stats.overdueTasks ? AlertCircle : CheckSquare, color: stats.overdueTasks ? 'text-red-500' : 'text-emerald-500' },
  ]

  const activityTypeColors: Record<string, string> = {
    call: 'bg-blue-100 text-blue-700', email: 'bg-purple-100 text-purple-700',
    meeting: 'bg-green-100 text-green-700', note: 'bg-yellow-100 text-yellow-700',
    task: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Dashboard" />
      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, color, sub }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {!stats.recentActivities.length ? (
              <p className="text-sm text-muted-foreground">No activity yet. Start by adding contacts or deals.</p>
            ) : (
              <ul className="space-y-3">
                {stats.recentActivities.map(a => (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <Badge variant="secondary" className={`shrink-0 capitalize ${activityTypeColors[a.type] ?? ''}`}>
                      {a.type}
                    </Badge>
                    <span className="flex-1">{a.subject}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(a.occurredAt!), { addSuffix: true })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
