import { auth } from '@/auth'
import { Header } from '@/components/layout/header'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Globe, Users, TrendingUp } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { getCompany, getCompanyContacts, getCompanyDeals, getCompanyActivities, getWorkspaceId, getCustomFieldDefinitions, getCustomFieldValues } from '@/lib/db/queries'
import { AccountDetailActions } from './account-detail-actions'
import { ActivityLogger } from '@/components/activities/activity-logger'
import { CustomFieldsSection } from '@/components/custom-fields/custom-fields-section'

interface Props { params: Promise<{ id: string }> }

const dealStatusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700', won: 'bg-green-100 text-green-700', lost: 'bg-gray-100 text-gray-500',
}

const activityTypeColors: Record<string, string> = {
  call: 'border-blue-400', email: 'border-purple-400',
  meeting: 'border-green-400', note: 'border-yellow-400', task: 'border-red-400',
}

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const workspaceId = await getWorkspaceId(session.user.id)
  if (!workspaceId) redirect('/login')

  const [company, contacts, deals, activities, companyFields, companyFieldValues] = await Promise.all([
    getCompany(id),
    getCompanyContacts(id),
    getCompanyDeals(id),
    getCompanyActivities(id),
    getCustomFieldDefinitions(workspaceId, 'companies'),
    getCustomFieldValues(id),
  ])

  if (!company) notFound()

  const totalValue = deals.filter(d => d.status === 'open').reduce((s, d) => s + Number(d.value ?? 0), 0)

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title={company.name} />
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/accounts" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />Back to Accounts
          </Link>
          <AccountDetailActions company={company} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Account Info</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:underline">
                  <Globe className="h-3.5 w-3.5" />{company.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {company.industry && <p className="text-muted-foreground">Industry: <span className="text-foreground">{company.industry}</span></p>}
              {company.size && <p className="text-muted-foreground">Size: <span className="text-foreground">{company.size}</span></p>}
              {totalValue > 0 && (
                <p className="text-muted-foreground">Open pipeline: <span className="text-green-600 font-medium">${totalValue.toLocaleString()}</span></p>
              )}
              {company.createdAt && (
                <p className="text-xs text-muted-foreground pt-1">Added {format(new Date(company.createdAt), 'MMM d, yyyy')}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Custom Fields</CardTitle></CardHeader>
            <CardContent>
              <CustomFieldsSection
                entityId={id}
                fields={companyFields}
                values={companyFieldValues}
                entityType="companies"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />Contacts ({contacts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!contacts.length ? (
                <p className="text-sm text-muted-foreground">No contacts linked.</p>
              ) : (
                <ul className="space-y-2">
                  {contacts.map(c => (
                    <li key={c.id} className="text-sm">
                      <Link href={`/contacts/${c.id}`} className="font-medium hover:underline">
                        {c.firstName} {c.lastName}
                      </Link>
                      {c.email && <span className="text-muted-foreground ml-2 text-xs">{c.email}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />Deals ({deals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!deals.length ? (
                <p className="text-sm text-muted-foreground">No deals linked.</p>
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
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm">Activity Timeline</CardTitle>
            <ActivityLogger workspaceId={workspaceId} companyId={id} />
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
  )
}
