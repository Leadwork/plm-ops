import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Building2, TrendingUp, CheckSquare, AlertCircle, Target, Trophy, Zap } from 'lucide-react'
import { getDashboardStats, getWorkspaceId, getAnalytics } from '@/lib/db/queries'
import { formatDistanceToNow } from 'date-fns'
import { PipelineFunnel } from '@/components/analytics/pipeline-funnel'
import { DealsBarChart } from '@/components/analytics/deals-bar-chart'
import { ContactsLineChart } from '@/components/analytics/contacts-line-chart'
import { ActivityDonut } from '@/components/analytics/activity-donut'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const workspaceId = await getWorkspaceId(session.user.id)
  if (!workspaceId) redirect('/register')

  const [stats, analytics] = await Promise.all([
    getDashboardStats(workspaceId, session.user.id),
    getAnalytics(workspaceId),
  ])

  const activityTypeColors: Record<string, string> = {
    call: 'bg-blue-100 text-blue-700', email: 'bg-purple-100 text-purple-700',
    meeting: 'bg-green-100 text-green-700', note: 'bg-yellow-100 text-yellow-700',
    task: 'bg-gray-100 text-gray-700',
  }

  const kpis = [
    {
      label: 'Contacts', value: stats.contacts, icon: Users,
      color: 'text-blue-500', bg: 'bg-blue-50',
    },
    {
      label: 'Accounts', value: stats.companies, icon: Building2,
      color: 'text-purple-500', bg: 'bg-purple-50',
    },
    {
      label: 'Pipeline Value', value: `$${stats.pipelineValue.toLocaleString()}`,
      icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50',
      sub: `${stats.openDeals} open deal${stats.openDeals !== 1 ? 's' : ''}`,
    },
    {
      label: 'Weighted Forecast', value: `$${Math.round(analytics.weightedValue).toLocaleString()}`,
      icon: Target, color: 'text-violet-500', bg: 'bg-violet-50',
      sub: 'probability-adjusted',
    },
    {
      label: 'Win Rate', value: `${analytics.winRate}%`,
      icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50',
      sub: `${analytics.wonCount} won · ${analytics.lostCount} lost`,
    },
    {
      label: 'Overdue Tasks', value: stats.overdueTasks,
      icon: stats.overdueTasks > 0 ? AlertCircle : CheckSquare,
      color: stats.overdueTasks > 0 ? 'text-red-500' : 'text-emerald-500',
      bg: stats.overdueTasks > 0 ? 'bg-red-50' : 'bg-emerald-50',
    },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Dashboard" />
      <div className="flex-1 p-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map(({ label, value, icon: Icon, color, bg, sub }) => (
            <Card key={label} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="text-xl font-bold tracking-tight">{value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-500" />
                Pipeline Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PipelineFunnel data={analytics.dealsByStage.map(s => ({
                stageName: s.stageName,
                count: Number(s.count),
                value: Number(s.value),
                probability: s.probability,
              }))} />
              {analytics.dealsByStage.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {analytics.dealsByStage.map(s => (
                    <div key={s.stageId} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{s.stageName}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{s.count} deals</span>
                        <span className="text-green-600">${Number(s.value).toLocaleString()}</span>
                        <span className="text-muted-foreground w-10 text-right">{s.probability}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Won vs Lost Revenue (12 months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DealsBarChart data={analytics.wonLostByMonth.map(r => ({
                month: r.month,
                status: r.status,
                count: Number(r.count),
                value: Number(r.value),
              }))} />
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Contact Growth (12 months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContactsLineChart data={analytics.contactsByMonth.map(r => ({
                month: r.month,
                count: Number(r.count),
              }))} />
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-violet-500 inline-block" /> New contacts</span>
                <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-pink-500 inline-block border-t-2 border-dashed border-pink-500" /> Cumulative</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-pink-500" />
                Activity Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityDonut data={analytics.activitiesByType.map(r => ({
                type: r.type,
                count: Number(r.count),
              }))} />
            </CardContent>
          </Card>
        </div>

        {/* Bottom row: Top Deals + Recent Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Top Open Deals</CardTitle>
            </CardHeader>
            <CardContent>
              {!analytics.topDeals.length ? (
                <p className="text-sm text-muted-foreground">No open deals yet.</p>
              ) : (
                <ul className="space-y-3">
                  {analytics.topDeals.map((d, i) => (
                    <li key={d.id} className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground font-mono w-4 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{d.title}</p>
                        {(d.contactFirstName || d.stageName) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {d.contactFirstName && `${d.contactFirstName} ${d.contactLastName ?? ''} · `}{d.stageName}
                          </p>
                        )}
                      </div>
                      <span className="font-semibold text-green-600 shrink-0">
                        ${Number(d.value ?? 0).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {!stats.recentActivities.length ? (
                <p className="text-sm text-muted-foreground">No activity yet. Start by adding contacts or deals.</p>
              ) : (
                <ul className="space-y-3">
                  {stats.recentActivities.map(a => (
                    <li key={a.id} className="flex items-start gap-3 text-sm">
                      <Badge variant="secondary" className={`shrink-0 capitalize text-xs ${activityTypeColors[a.type] ?? ''}`}>
                        {a.type}
                      </Badge>
                      <span className="flex-1 truncate">{a.subject}</span>
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
    </div>
  )
}
