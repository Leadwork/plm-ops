import { auth } from '@/auth'
import { Header } from '@/components/layout/header'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ProjectTaskBoard } from './project-task-board'
import { getProject, getProjectData, getWorkspaceId } from '@/lib/db/queries'

interface Props { params: Promise<{ id: string }> }

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const workspaceId = await getWorkspaceId(session.user.id)
  if (!workspaceId) redirect('/register')

  const project = await getProject(id)
  if (!project) notFound()

  const { taskLists, tasks, members } = await getProjectData(id, workspaceId)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title={project.name} />
      <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
        <Link href="/projects" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit">
          <ChevronLeft className="h-4 w-4" />Back to Projects
        </Link>
        <ProjectTaskBoard
          project={project}
          taskLists={taskLists}
          tasks={tasks}
          members={members}
          workspaceId={workspaceId}
        />
      </div>
    </div>
  )
}
