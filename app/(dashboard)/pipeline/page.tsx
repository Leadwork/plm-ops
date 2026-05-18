import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { PipelineBoard } from '@/components/kanban/pipeline-board'

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user!.id).single()

  const workspaceId = profile?.workspace_id!

  const { data: pipeline } = await supabase
    .from('pipelines')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('is_default', true)
    .single()

  const pipelineId = pipeline?.id!

  const [{ data: stages }, { data: deals }, { data: contacts }, { data: accounts }] = await Promise.all([
    supabase.from('stages').select('*').eq('pipeline_id', pipelineId).order('position'),
    supabase.from('deals')
      .select('*, contacts(first_name, last_name), accounts(name)')
      .eq('workspace_id', workspaceId)
      .eq('status', 'open'),
    supabase.from('contacts').select('*').eq('workspace_id', workspaceId).order('first_name'),
    supabase.from('accounts').select('*').eq('workspace_id', workspaceId).order('name'),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Sales Pipeline" />
      <div className="flex-1 p-6 overflow-hidden">
        <PipelineBoard
          stages={stages ?? []}
          deals={(deals ?? []) as Parameters<typeof PipelineBoard>[0]['deals']}
          contacts={contacts ?? []}
          accounts={accounts ?? []}
          workspaceId={workspaceId}
          pipelineId={pipelineId}
        />
      </div>
    </div>
  )
}
