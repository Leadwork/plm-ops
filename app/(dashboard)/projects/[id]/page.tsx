import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ProjectTaskBoard } from './project-task-board'

interface Props { params: Promise<{ id: string }> }

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user!.id).single()

  const workspaceId = profile?.workspace_id!

  const { data: project } = await supabase
    .from('projects').select('*').eq('id', id).single()

  if (!project) notFound()

  const [{ data: taskLists }, { data: tasks }, { data: members }] = await Promise.all([
    supabase.from('task_lists').select('*').eq('project_id', id).order('position'),
    supabase.from('tasks').select('*').eq('project_id', id).order('created_at'),
    supabase.from('workspace_members')
      .select('user_id, profiles(full_name)')
      .eq('workspace_id', workspaceId),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title={project.name} />
      <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
        <Link href="/projects" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit">
          <ChevronLeft className="h-4 w-4" />Back to Projects
        </Link>
        <ProjectTaskBoard
          project={project}
          taskLists={taskLists ?? []}
          tasks={tasks ?? []}
          members={(members ?? []) as unknown as { user_id: string; profiles: { full_name: string | null } | null }[]}
          workspaceId={workspaceId}
        />
      </div>
    </div>
  )
}
