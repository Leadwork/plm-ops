import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { AccountsClient } from './accounts-client'
import { getCompanies, getWorkspaceId } from '@/lib/db/queries'

export default async function AccountsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const workspaceId = await getWorkspaceId(session.user.id)
  if (!workspaceId) redirect('/register')

  const companies = await getCompanies(workspaceId)

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Accounts" />
      <AccountsClient companies={companies} workspaceId={workspaceId} />
    </div>
  )
}
