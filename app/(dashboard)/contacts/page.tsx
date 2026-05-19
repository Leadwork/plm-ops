import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ContactsClient } from './contacts-client'
import { getContacts, getCompanies, getWorkspaceId } from '@/lib/db/queries'

export default async function ContactsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const workspaceId = await getWorkspaceId(session.user.id)
  if (!workspaceId) redirect('/register')

  const [contacts, companies] = await Promise.all([
    getContacts(workspaceId),
    getCompanies(workspaceId),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Contacts" />
      <ContactsClient contacts={contacts} companies={companies} workspaceId={workspaceId} />
    </div>
  )
}
