import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Mail, Phone, Building2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Contact, Activity, Deal, Account } from '@/lib/types'

interface Props { params: Promise<{ id: string }> }

export default async function ContactDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: contact } = await supabase
    .from('contacts').select('*').eq('id', id).single()

  if (!contact) notFound()

  const c = contact as Contact

  const [{ data: activities }, { data: deals }, account] = await Promise.all([
    supabase.from('activities').select('*').eq('contact_id', id)
      .order('occurred_at', { ascending: false }).limit(20),
    supabase.from('deals').select('*').eq('contact_id', id)
      .order('created_at', { ascending: false }),
    c.account_id
      ? supabase.from('accounts').select('id, name').eq('id', c.account_id).single()
          .then(r => r.data as Pick<Account, 'id' | 'name'> | null)
      : Promise.resolve(null),
  ])

  const typedActivities = (activities ?? []) as Activity[]
  const typedDeals = (deals ?? []) as Deal[]

  const statusColors: Record<string, string> = {
    lead: 'bg-blue-100 text-blue-700',
    prospect: 'bg-yellow-100 text-yellow-700',
    customer: 'bg-green-100 text-green-700',
    churned: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title={`${c.first_name} ${c.last_name}`} />
      <div className="flex-1 p-6 space-y-6">
        <Link href="/contacts" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to Contacts
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Contact Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Badge variant="secondary" className={`capitalize ${statusColors[c.status] ?? ''}`}>{c.status}</Badge>
              {c.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />{c.email}
                </div>
              )}
              {c.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />{c.phone}
                </div>
              )}
              {account && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  <Link href={`/accounts/${account.id}`} className="hover:underline">{account.name}</Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Deals</CardTitle></CardHeader>
            <CardContent>
              {!typedDeals.length ? (
                <p className="text-sm text-muted-foreground">No deals yet.</p>
              ) : (
                <ul className="space-y-2">
                  {typedDeals.map(d => (
                    <li key={d.id} className="text-sm flex justify-between">
                      <span className="font-medium">{d.title}</span>
                      <span className="text-muted-foreground">${(d.value ?? 0).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Activity Timeline</CardTitle></CardHeader>
            <CardContent>
              {!typedActivities.length ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {typedActivities.map(a => (
                    <li key={a.id} className="text-sm border-l-2 border-border pl-3">
                      <p className="font-medium capitalize">{a.type}: {a.subject}</p>
                      {a.notes && <p className="text-muted-foreground">{a.notes}</p>}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(a.occurred_at), { addSuffix: true })}
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
