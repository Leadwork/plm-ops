import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PipelineBoard } from '@/components/kanban/pipeline-board'
import { getPipelineData, getWorkspaceId } from '@/lib/db/queries'

export default async function PipelinePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const workspaceId = await getWorkspaceId(session.user.id)
  if (!workspaceId) redirect('/register')

  const data = await getPipelineData(workspaceId)

  if (!data) {
    return (
      <div className="flex flex-col flex-1 overflow-auto">
        <Header title="Sales Pipeline" />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          No pipeline configured.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Sales Pipeline" />
      <div className="flex-1 p-6 overflow-hidden">
        <PipelineBoard
          stages={data.stages}
          deals={data.deals}
          contacts={data.contacts}
          companies={data.companies}
          workspaceId={workspaceId}
          pipelineId={data.pipeline.id}
        />
      </div>
    </div>
  )
}
