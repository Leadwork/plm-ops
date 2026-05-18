import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { MyTasksClient } from './my-tasks-client'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user!.id).single()

  const workspaceId = profile?.workspace_id!

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, projects(name)')
    .eq('workspace_id', workspaceId)
    .eq('assignee_id', user!.id)
    .neq('status', 'done')
    .order('due_date', { ascending: true, nullsFirst: false })

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="My Tasks" />
      <MyTasksClient tasks={(tasks ?? []) as Parameters<typeof MyTasksClient>[0]['tasks']} workspaceId={workspaceId} />
    </div>
  )
}
