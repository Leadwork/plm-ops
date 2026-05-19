'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createContact, updateContact, deleteContact } from '@/lib/actions/contacts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Trash2, Pencil, Linkedin } from 'lucide-react'
import { toast } from 'sonner'
import type { Contact, Company } from '@/lib/db/schema'

type ContactRow = {
  id: string; firstName: string; lastName: string; email: string | null
  phone: string | null; status: string; accountId: string | null; companyName: string | null
  linkedinUrl: string | null
}

const statusColors: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-700', prospect: 'bg-yellow-100 text-yellow-700',
  customer: 'bg-green-100 text-green-700', churned: 'bg-gray-100 text-gray-600',
}

function ContactForm({ workspaceId, companies, contact, onClose }: {
  workspaceId: string; companies: Company[]; contact?: ContactRow; onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState(contact?.status ?? 'lead')
  const [accountId, setAccountId] = useState(contact?.accountId ?? '')

  function handleStatusChange(v: string | null) { if (v) setStatus(v) }
  function handleAccountChange(v: string | null) { setAccountId(v ?? '') }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const data = {
      workspaceId,
      firstName: form.get('first_name') as string,
      lastName: form.get('last_name') as string,
      email: (form.get('email') as string) || undefined,
      phone: (form.get('phone') as string) || undefined,
      status,
      accountId: accountId || undefined,
      linkedinUrl: (form.get('linkedin_url') as string) || undefined,
    }
    startTransition(async () => {
      try {
        if (contact) await updateContact(contact.id, data)
        else await createContact(data)
        toast.success(contact ? 'Contact updated' : 'Contact created')
        onClose()
      } catch { toast.error('Failed to save contact') }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="first_name">First name</Label>
          <Input id="first_name" name="first_name" defaultValue={contact?.firstName} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name">Last name</Label>
          <Input id="last_name" name="last_name" defaultValue={contact?.lastName} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={contact?.email ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" defaultValue={contact?.phone ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="linkedin_url">LinkedIn URL</Label>
        <Input id="linkedin_url" name="linkedin_url" placeholder="https://linkedin.com/in/…" defaultValue={contact?.linkedinUrl ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['lead', 'prospect', 'customer', 'churned'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Account</Label>
        <Select value={accountId} onValueChange={handleAccountChange}>
          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  )
}

interface Props { contacts: ContactRow[]; companies: Company[]; workspaceId: string }

export function ContactsClient({ contacts, companies, workspaceId }: Props) {
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ContactRow | undefined>()

  const filtered = contacts.filter(c =>
    `${c.firstName} ${c.lastName} ${c.email ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  function handleDelete(id: string) {
    if (!confirm('Delete this contact?')) return
    startTransition(async () => {
      try { await deleteContact(id); toast.success('Contact deleted') }
      catch { toast.error('Failed to delete') }
    })
  }

  return (
    <div className="flex-1 p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => { setEditing(undefined); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />Add Contact
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Email</TableHead>
              <TableHead>Phone</TableHead><TableHead>Account</TableHead>
              <TableHead>Status</TableHead><TableHead className="w-20" />
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
                    {c.firstName} {c.lastName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.email ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{c.phone ?? '—'}</TableCell>
                <TableCell>{c.companyName ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`capitalize ${statusColors[c.status] ?? ''}`}>{c.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Contact' : 'New Contact'}</DialogTitle></DialogHeader>
          <ContactForm workspaceId={workspaceId} companies={companies} contact={editing} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
