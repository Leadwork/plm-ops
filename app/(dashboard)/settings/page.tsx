import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { SettingsClient } from './settings-client'
import type { Stage } from '@/lib/types'
export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user!.id).single()

  const workspaceId = (profile as { workspace_id: string | null })?.workspace_id

  const [{ data: workspace }, { data: members }, { data: stages }] = await Promise.all([
    workspaceId
      ? supabase.from('workspaces').select('id, name').eq('id', workspaceId).single()
      : Promise.resolve({ data: null }),
    workspaceId
      ? supabase.from('workspace_members')
          .select('user_id, role, profiles(full_name)')
          .eq('workspace_id', workspaceId)
      : Promise.resolve({ data: [] }),
    workspaceId
      ? supabase.from('stages')
          .select('*, pipelines!inner(workspace_id)')
          .eq('pipelines.workspace_id', workspaceId)
          .order('position')
      : Promise.resolve({ data: [] }),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Settings" />
      <SettingsClient
        workspace={workspace as { id: string; name: string } | null}
        members={(members ?? []) as unknown as { user_id: string; role: string; profiles: { full_name: string | null } | null }[]}
        stages={(stages ?? []) as unknown as Stage[]}
        currentUserId={user!.id}
      />
    </div>
  )
}
