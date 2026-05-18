import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, TrendingUp, CheckSquare, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', user!.id)
    .single()

  const workspaceId = profile?.workspace_id

  const [contacts, accounts, deals, tasks, activities] = await Promise.all([
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId!),
    supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId!),
    supabase.from('deals').select('id, value', { count: 'exact' }).eq('workspace_id', workspaceId!).eq('status', 'open'),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId!).eq('status', 'todo').lt('due_date', new Date().toISOString()),
    supabase.from('activities').select('type, subject, occurred_at').eq('workspace_id', workspaceId!).order('occurred_at', { ascending: false }).limit(8),
  ])

  const pipelineValue = deals.data?.reduce((sum, d) => sum + (d.value ?? 0), 0) ?? 0

  const stats = [
    { label: 'Contacts', value: contacts.count ?? 0, icon: Users, color: 'text-blue-500' },
    { label: 'Accounts', value: accounts.count ?? 0, icon: Building2, color: 'text-purple-500' },
    { label: 'Open Deals', value: `$${pipelineValue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-500', sub: `${deals.count ?? 0} deals` },
    { label: 'Overdue Tasks', value: tasks.count ?? 0, icon: tasks.count ? AlertCircle : CheckSquare, color: tasks.count ? 'text-red-500' : 'text-emerald-500' },
  ]

  const activityTypeColors: Record<string, string> = {
    call: 'bg-blue-100 text-blue-700',
    email: 'bg-purple-100 text-purple-700',
    meeting: 'bg-green-100 text-green-700',
    note: 'bg-yellow-100 text-yellow-700',
    task: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Dashboard" />
      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, color, sub }) => (
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
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {!activities.data?.length ? (
              <p className="text-sm text-muted-foreground">No activity yet. Start by adding contacts or deals.</p>
            ) : (
              <ul className="space-y-3">
                {activities.data.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Badge
                      variant="secondary"
                      className={`shrink-0 capitalize ${activityTypeColors[a.type] ?? ''}`}
                    >
                      {a.type}
                    </Badge>
                    <span className="flex-1">{a.subject}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(a.occurred_at), { addSuffix: true })}
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
