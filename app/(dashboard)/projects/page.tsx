import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ProjectsClient } from './projects-client'
import { getProjects, getWorkspaceId } from '@/lib/db/queries'

export default async function ProjectsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const workspaceId = await getWorkspaceId(session.user.id)
  if (!workspaceId) redirect('/register')

  const projects = await getProjects(workspaceId)

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Projects" />
      <ProjectsClient projects={projects} workspaceId={workspaceId} />
    </div>
  )
}
