import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getWorkspaceId, getAnalytics, getDashboardStats } from '@/lib/db/queries'
import { PipelineFunnel } from '@/components/analytics/pipeline-funnel'
import { DealsBarChart } from '@/components/analytics/deals-bar-chart'
import { ContactsLineChart } from '@/components/analytics/contacts-line-chart'
import { ActivityDonut } from '@/components/analytics/activity-donut'
import { TrendingUp, Target, Trophy, Users, CheckSquare, BarChart3 } from 'lucide-react'

export default async function ReportsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const workspaceId = await getWorkspaceId(session.user.id)
  if (!workspaceId) redirect('/register')

  const [stats, analytics] = await Promise.all([
    getDashboardStats(workspaceId, session.user.id),
    getAnalytics(workspaceId),
  ])

  const taskDone = analytics.taskStats.find(t => t.status === 'done')
  const taskTodo = analytics.taskStats.find(t => t.status === 'todo')
  const totalTasks = analytics.taskStats.reduce((s, t) => s + Number(t.count), 0)
  const completionRate = totalTasks > 0 ? Math.round((Number(taskDone?.count ?? 0) / totalTasks) * 100) : 0

  const totalActivities = analytics.activitiesByType.reduce((s, r) => s + Number(r.count), 0)

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Reports" />
      <div className="flex-1 p-6 space-y-6">

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Weighted Forecast</p>
                <Target className="h-4 w-4 text-violet-500" />
              </div>
              <p className="text-2xl font-bold">${Math.round(analytics.weightedValue).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">from {stats.openDeals} open deals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Win Rate</p>
                <Trophy className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold">{analytics.winRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">{analytics.wonCount} won · {analytics.lostCount} lost</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Task Completion</p>
                <CheckSquare className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{completionRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">{Number(taskDone?.count ?? 0)} of {totalTasks} tasks done</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Activities</p>
                <BarChart3 className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{totalActivities}</p>
              <p className="text-xs text-muted-foreground mt-1">calls, emails, meetings</p>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline performance */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-500" />Pipeline by Stage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <PipelineFunnel data={analytics.dealsByStage.map(s => ({
                stageName: s.stageName,
                count: Number(s.count),
                value: Number(s.value),
                probability: s.probability,
              }))} />
              {analytics.dealsByStage.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 font-medium text-muted-foreground">Stage</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Deals</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Value</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Weighted</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Prob.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {analytics.dealsByStage.map(s => {
                        const weighted = (Number(s.value) * (s.probability ?? 0)) / 100
                        return (
                          <tr key={s.stageId} className="hover:bg-muted/30">
                            <td className="p-2 font-medium">{s.stageName}</td>
                            <td className="p-2 text-right">{s.count}</td>
                            <td className="p-2 text-right text-green-600">${Number(s.value).toLocaleString()}</td>
                            <td className="p-2 text-right text-violet-600">${Math.round(weighted).toLocaleString()}</td>
                            <td className="p-2 text-right text-muted-foreground">{s.probability}%</td>
                          </tr>
                        )
                      })}
                      <tr className="bg-muted/30 font-semibold">
                        <td className="p-2">Total</td>
                        <td className="p-2 text-right">{analytics.dealsByStage.reduce((s, r) => s + Number(r.count), 0)}</td>
                        <td className="p-2 text-right text-green-600">${stats.pipelineValue.toLocaleString()}</td>
                        <td className="p-2 text-right text-violet-600">${Math.round(analytics.weightedValue).toLocaleString()}</td>
                        <td className="p-2 text-right" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />Won vs Lost Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DealsBarChart data={analytics.wonLostByMonth.map(r => ({
                month: r.month, status: r.status,
                count: Number(r.count), value: Number(r.value),
              }))} />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-center">
                  <p className="text-xs text-green-700 font-medium">Won Revenue</p>
                  <p className="text-lg font-bold text-green-700">
                    ${analytics.wonLostByMonth.filter(r => r.status === 'won').reduce((s, r) => s + Number(r.value), 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                  <p className="text-xs text-red-700 font-medium">Lost Revenue</p>
                  <p className="text-lg font-bold text-red-700">
                    ${analytics.wonLostByMonth.filter(r => r.status === 'lost').reduce((s, r) => s + Number(r.value), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact growth + Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />Contact Growth (12 months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContactsLineChart data={analytics.contactsByMonth.map(r => ({
                month: r.month, count: Number(r.count),
              }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Activity Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityDonut data={analytics.activitiesByType.map(r => ({
                type: r.type, count: Number(r.count),
              }))} />
              <div className="mt-3 space-y-1.5">
                {analytics.activitiesByType.map(r => (
                  <div key={r.type} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-muted-foreground">{r.type}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.count}</span>
                      <span className="text-muted-foreground w-8 text-right">
                        {totalActivities > 0 ? Math.round((Number(r.count) / totalActivities) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-green-500" />Task Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {analytics.taskStats.map(t => (
                <div key={t.status} className="text-center p-4 rounded-lg bg-muted/40">
                  <p className="text-2xl font-bold">{t.count}</p>
                  <Badge variant="secondary" className="mt-1 text-xs capitalize">{t.status}</Badge>
                </div>
              ))}
              <div className="text-center p-4 rounded-lg bg-muted/40">
                <p className="text-2xl font-bold">{completionRate}%</p>
                <Badge variant="secondary" className="mt-1 text-xs">Completion Rate</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
