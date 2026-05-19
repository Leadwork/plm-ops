import { auth } from '@/auth'
import { Header } from '@/components/layout/header'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Mail, Phone, Building2, Linkedin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { getContact, getContactActivities, getContactDeals, getCompany } from '@/lib/db/queries'

interface Props { params: Promise<{ id: string }> }

const statusColors: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-700', prospect: 'bg-yellow-100 text-yellow-700',
  customer: 'bg-green-100 text-green-700', churned: 'bg-gray-100 text-gray-600',
}

export default async function ContactDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [contact, activities, deals] = await Promise.all([
    getContact(id),
    getContactActivities(id),
    getContactDeals(id),
  ])

  if (!contact) notFound()

  const company = contact.accountId ? await getCompany(contact.accountId) : null

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title={`${contact.firstName} ${contact.lastName}`} />
      <div className="flex-1 p-6 space-y-6">
        <Link href="/contacts" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Contacts
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Contact Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Badge variant="secondary" className={`capitalize ${statusColors[contact.status] ?? ''}`}>{contact.status}</Badge>
              {contact.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />{contact.email}
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />{contact.phone}
                </div>
              )}
              {company && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <Link href={`/accounts/${company.id}`} className="hover:underline">{company.name}</Link>
                </div>
              )}
              {contact.linkedinUrl && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Linkedin className="h-3.5 w-3.5" />
                  <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                    {contact.linkedinUrl.replace('https://www.linkedin.com/in/', '').replace('https://linkedin.com/in/', '')}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Deals</CardTitle></CardHeader>
            <CardContent>
              {!deals.length ? (
                <p className="text-sm text-muted-foreground">No deals yet.</p>
              ) : (
                <ul className="space-y-2">
                  {deals.map(d => (
                    <li key={d.id} className="text-sm flex justify-between">
                      <span className="font-medium">{d.title}</span>
                      <span className="text-muted-foreground">${Number(d.value ?? 0).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Activity Timeline</CardTitle></CardHeader>
            <CardContent>
              {!activities.length ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {activities.map(a => (
                    <li key={a.id} className="text-sm border-l-2 border-border pl-3">
                      <p className="font-medium capitalize">{a.type}: {a.subject}</p>
                      {a.notes && <p className="text-muted-foreground">{a.notes}</p>}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(a.occurredAt!), { addSuffix: true })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
