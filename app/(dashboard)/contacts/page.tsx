import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ContactsClient } from './contacts-client'

export default async function ContactsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('workspace_id').eq('id', user!.id).single()

  const workspaceId = profile?.workspace_id!

  const [{ data: contacts }, { data: accounts }] = await Promise.all([
    supabase.from('contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    supabase.from('accounts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name'),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Contacts" />
      <ContactsClient contacts={contacts ?? []} accounts={accounts ?? []} workspaceId={workspaceId} />
    </div>
  )
}
