'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ContactForm } from '@/components/contacts/contact-form'
import { Plus, Search, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import type { Contact, Account } from '@/lib/types'

type ContactWithAccount = Contact & { accounts?: { name: string } | null }

const statusColors: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-700',
  prospect: 'bg-yellow-100 text-yellow-700',
  customer: 'bg-green-100 text-green-700',
  churned: 'bg-gray-100 text-gray-600',
}

interface Props {
  contacts: ContactWithAccount[]
  accounts: Account[]
  workspaceId: string
}

export function ContactsClient({ contacts, accounts, workspaceId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | undefined>()

  const filtered = contacts.filter(c =>
    `${c.first_name} ${c.last_name} ${c.email ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  async function deleteContact(id: string) {
    if (!confirm('Delete this contact?')) return
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Contact deleted'); router.refresh() }
  }

  function openNew() { setEditing(undefined); setDialogOpen(true) }
  function openEdit(c: Contact) { setEditing(c); setDialogOpen(true) }

  return (
    <div className="flex-1 p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Contact</Button>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No contacts found.</TableCell></TableRow>
            )}
            {filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/contacts/${c.id}`} className="font-medium hover:underline">
                    {c.first_name} {c.last_name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.email ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{c.phone ?? '—'}</TableCell>
                <TableCell>{c.accounts?.name ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`capitalize ${statusColors[c.status] ?? ''}`}>{c.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteContact(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Contact' : 'New Contact'}</DialogTitle>
          </DialogHeader>
          <ContactForm
            workspaceId={workspaceId}
            accounts={accounts}
            contact={editing}
            onClose={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
