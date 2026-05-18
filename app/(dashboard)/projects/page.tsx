import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ProjectsClient } from './projects-client'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user!.id).single()

  const workspaceId = profile?.workspace_id!

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Projects" />
      <ProjectsClient projects={projects ?? []} workspaceId={workspaceId} />
    </div>
  )
}
