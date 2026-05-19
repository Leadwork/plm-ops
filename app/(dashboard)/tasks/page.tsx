import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { MyTasksClient } from './my-tasks-client'
import { getMyTasks, getWorkspaceId } from '@/lib/db/queries'

export default async function TasksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const workspaceId = await getWorkspaceId(session.user.id)
  if (!workspaceId) redirect('/register')

  const tasks = await getMyTasks(workspaceId, session.user.id)

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="My Tasks" />
      <MyTasksClient tasks={tasks} workspaceId={workspaceId} />
    </div>
  )
}
