import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { AccountsClient } from './accounts-client'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user!.id).single()

  const workspaceId = profile?.workspace_id!

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name')

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Accounts" />
      <AccountsClient accounts={accounts ?? []} workspaceId={workspaceId} />
    </div>
  )
}
