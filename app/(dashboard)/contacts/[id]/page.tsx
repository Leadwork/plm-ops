import { auth } from '@/auth'
import { Header } from '@/components/layout/header'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Mail, Phone, Building2, ExternalLink } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { getContact, getContactActivities, getContactDeals, getCompany, getCompanies, getWorkspaceId, getCustomFieldDefinitions, getCustomFieldValues } from '@/lib/db/queries'
import { ContactDetailActions, FollowUpButton } from './contact-detail-actions'
import { ActivityLogger } from '@/components/activities/activity-logger'
import { CustomFieldsSection } from '@/components/custom-fields/custom-fields-section'

interface Props { params: Promise<{ id: string }> }

const statusColors: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-700', prospect: 'bg-yellow-100 text-yellow-700',
  customer: 'bg-green-100 text-green-700', churned: 'bg-gray-100 text-gray-600',
}

const activityTypeColors: Record<string, string> = {
  call: 'border-blue-400', email: 'border-purple-400',
  meeting: 'border-green-400', note: 'border-yellow-400', task: 'border-red-400',
}

const dealStatusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700', won: 'bg-green-100 text-green-700', lost: 'bg-gray-100 text-gray-500',
}

export default async function ContactDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const workspaceId = await getWorkspaceId(session.user.id)
  if (!workspaceId) redirect('/login')

  const [contact, activities, deals, allCompanies, contactFields, contactFieldValues] = await Promise.all([
    getContact(id),
    getContactActivities(id),
    getContactDeals(id),
    getCompanies(workspaceId),
    getCustomFieldDefinitions(workspaceId, 'contacts'),
    getCustomFieldValues(id),
  ])

  if (!contact) notFound()

  const company = contact.accountId ? await getCompany(contact.accountId) : null

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title={`${contact.firstName} ${contact.lastName}`} />
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/contacts" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Back to Contacts
          </Link>
          <div className="flex items-center gap-2">
            <FollowUpButton contact={contact} workspaceId={workspaceId} />
            <ContactDetailActions contact={contact} companies={allCompanies} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Contact Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Badge variant="secondary" className={`capitalize ${statusColors[contact.status] ?? ''}`}>{contact.status}</Badge>
              {contact.title && (
                <p className="font-medium text-foreground">{contact.title}</p>
              )}
              {contact.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
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
                  <ExternalLink className="h-3.5 w-3.5" />
                  <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                    {contact.linkedinUrl.replace('https://www.linkedin.com/in/', '').replace('https://linkedin.com/in/', '')}
                  </a>
                </div>
              )}
              {contact.createdAt && (
                <p className="text-xs text-muted-foreground pt-1">
                  Added {format(new Date(contact.createdAt), 'MMM d, yyyy')}
                </p>
              )}
            </CardContent>
          </Card>

          {contact.notes && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Custom Fields</CardTitle></CardHeader>
            <CardContent>
              <CustomFieldsSection
                entityId={id}
                fields={contactFields}
                values={contactFieldValues}
                entityType="contacts"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Deals ({deals.length})</CardTitle></CardHeader>
            <CardContent>
              {!deals.length ? (
                <p className="text-sm text-muted-foreground">No deals yet.</p>
              ) : (
                <ul className="space-y-2">
                  {deals.map(d => (
                    <li key={d.id} className="text-sm flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{d.title}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground">${Number(d.value ?? 0).toLocaleString()}</span>
                        <Badge variant="secondary" className={`text-xs capitalize ${dealStatusColors[d.status] ?? ''}`}>{d.status}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm">Activity Timeline</CardTitle>
              <ActivityLogger workspaceId={workspaceId} contactId={id} />
            </CardHeader>
            <CardContent>
              {!activities.length ? (
                <p className="text-sm text-muted-foreground">No activity yet. Log your first interaction above.</p>
              ) : (
                <ul className="space-y-3">
                  {activities.map(a => (
                    <li key={a.id} className={`text-sm border-l-2 pl-3 ${activityTypeColors[a.type] ?? 'border-border'}`}>
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
