import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Globe, Users, TrendingUp } from 'lucide-react'
import type { Account, Contact, Deal } from '@/lib/types'

interface Props { params: Promise<{ id: string }> }

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rawAccount } = await supabase
    .from('accounts').select('*').eq('id', id).single()

  if (!rawAccount) notFound()
  const account = rawAccount as Account

  const [{ data: rawContacts }, { data: rawDeals }] = await Promise.all([
    supabase.from('contacts').select('id, first_name, last_name, email, status')
      .eq('account_id', id).order('first_name'),
    supabase.from('deals').select('id, title, value, status')
      .eq('account_id', id).order('created_at', { ascending: false }),
  ])
  const contacts = (rawContacts ?? []) as Pick<Contact, 'id' | 'first_name' | 'last_name' | 'email' | 'status'>[]
  const deals = (rawDeals ?? []) as Pick<Deal, 'id' | 'title' | 'value' | 'status'>[]

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title={account.name} />
      <div className="flex-1 p-6 space-y-6">
        <Link href="/accounts" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />Back to Accounts
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Account Info</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {account.website && (
                <a href={account.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:underline">
                  <Globe className="h-3.5 w-3.5" />{account.website}
                </a>
              )}
              {account.industry && <p className="text-muted-foreground">Industry: {account.industry}</p>}
              {account.size && <p className="text-muted-foreground">Size: {account.size}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />Contacts ({contacts?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!contacts?.length ? (
                <p className="text-sm text-muted-foreground">No contacts linked.</p>
              ) : (
                <ul className="space-y-2">
                  {contacts.map(c => (
                    <li key={c.id} className="text-sm">
                      <Link href={`/contacts/${c.id}`} className="font-medium hover:underline">
                        {c.first_name} {c.last_name}
                      </Link>
                      {c.email && <span className="text-muted-foreground ml-2">{c.email}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />Deals ({deals?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!deals?.length ? (
                <p className="text-sm text-muted-foreground">No deals linked.</p>
              ) : (
                <ul className="space-y-2">
                  {deals.map(d => (
                    <li key={d.id} className="text-sm flex justify-between">
                      <span className="font-medium">{d.title}</span>
                      <span className="text-muted-foreground">${(d.value ?? 0).toLocaleString()}</span>
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
