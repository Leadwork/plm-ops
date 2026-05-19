'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { createContact, updateContact, deleteContact } from '@/lib/actions/contacts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Trash2, Pencil, ChevronUp, ChevronDown, ChevronsUpDown, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { Company } from '@/lib/db/schema'

type ContactRow = {
  id: string; firstName: string; lastName: string; email: string | null
  phone: string | null; status: string; accountId: string | null; companyName: string | null
  linkedinUrl: string | null; createdAt: Date | null; score: number | null
}

type SortKey = 'name' | 'email' | 'status' | 'company' | 'createdAt' | 'score'
type SortDir = 'asc' | 'desc'

function ScoreBadge({ score }: { score: number | null }) {
  const s = Number(score ?? 0)
  const color = s >= 70 ? 'bg-green-100 text-green-700' : s >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{s}</span>
}

const statusColors: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-700', prospect: 'bg-yellow-100 text-yellow-700',
  customer: 'bg-green-100 text-green-700', churned: 'bg-gray-100 text-gray-600',
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3 w-3 opacity-30 inline ml-1" />
  return sortDir === 'asc'
    ? <ChevronUp className="h-3 w-3 inline ml-1" />
    : <ChevronDown className="h-3 w-3 inline ml-1" />
}

function ContactForm({ workspaceId, companies, contact, onClose }: {
  workspaceId: string; companies: Company[]; contact?: ContactRow; onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState(contact?.status ?? 'lead')
  const [accountId, setAccountId] = useState(contact?.accountId ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(firstName: string, lastName: string) {
    const e: Record<string, string> = {}
    if (!firstName.trim()) e.firstName = 'First name is required'
    if (!lastName.trim()) e.lastName = 'Last name is required'
    setErrors(e)
    return !Object.keys(e).length
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const firstName = form.get('first_name') as string
    const lastName = form.get('last_name') as string
    if (!validate(firstName, lastName)) return
    const data = {
      workspaceId,
      firstName, lastName,
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
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name">Last name</Label>
          <Input id="last_name" name="last_name" defaultValue={contact?.lastName} required />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
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
        <Select value={status} onValueChange={v => { if (v) setStatus(v) }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['lead', 'prospect', 'customer', 'churned'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Account</Label>
        <Select value={accountId} onValueChange={v => setAccountId(v ?? '')}>
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
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ContactRow | undefined>()
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [importing, setImporting] = useState(false)

  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    try {
      const text = await file.text()
      const res = await fetch('/api/contacts/import', { method: 'POST', body: text, headers: { 'Content-Type': 'text/csv' } })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Import failed'); return }
      toast.success(`Imported ${data.imported} contacts`)
      window.location.reload()
    } catch {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let list = contacts.filter(c => {
      const matchesSearch = `${c.firstName} ${c.lastName} ${c.email ?? ''} ${c.companyName ?? ''}`.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter
      return matchesSearch && matchesStatus
    })
    list = [...list].sort((a, b) => {
      if (sortKey === 'score') {
        const diff = Number(a.score ?? 0) - Number(b.score ?? 0)
        return sortDir === 'asc' ? diff : -diff
      }
      let av: string, bv: string
      if (sortKey === 'name') { av = `${a.firstName} ${a.lastName}`; bv = `${b.firstName} ${b.lastName}` }
      else if (sortKey === 'email') { av = a.email ?? ''; bv = b.email ?? '' }
      else if (sortKey === 'status') { av = a.status; bv = b.status }
      else if (sortKey === 'company') { av = a.companyName ?? ''; bv = b.companyName ?? '' }
      else { av = a.createdAt?.toISOString() ?? ''; bv = b.createdAt?.toISOString() ?? '' }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return list
  }, [contacts, search, statusFilter, sortKey, sortDir])

  function handleDelete(id: string) {
    if (!confirm('Delete this contact?')) return
    startTransition(async () => {
      try { await deleteContact(id); toast.success('Contact deleted') }
      catch { toast.error('Failed to delete') }
    })
  }

  function ThHead({ col, children }: { col: SortKey; children: React.ReactNode }) {
    return (
      <TableHead className="cursor-pointer select-none hover:bg-accent/50" onClick={() => handleSort(col)}>
        {children}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </TableHead>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {['lead', 'prospect', 'customer', 'churned'].map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <input
            type="file" accept=".csv,text/csv" className="sr-only"
            id="csv-import-input"
            onChange={handleImportCSV}
            disabled={importing}
          />
          <Button variant="outline" disabled={importing} onClick={() => document.getElementById('csv-import-input')?.click()}>
            <Upload className="h-4 w-4 mr-2" />{importing ? 'Importing…' : 'Import CSV'}
          </Button>
          <Button onClick={() => { setEditing(undefined); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />Add Contact
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <ThHead col="name">Name</ThHead>
              <ThHead col="email">Email</ThHead>
              <TableHead>Phone</TableHead>
              <ThHead col="company">Account</ThHead>
              <ThHead col="status">Status</ThHead>
              <ThHead col="score">Score</ThHead>
              <ThHead col="createdAt">Added</ThHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No contacts found.</TableCell></TableRow>
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
                <TableCell><ScoreBadge score={c.score} /></TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {c.createdAt ? format(new Date(c.createdAt), 'MMM d, yyyy') : '—'}
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
