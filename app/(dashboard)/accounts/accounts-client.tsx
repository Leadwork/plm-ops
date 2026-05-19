'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { createCompany, updateCompany, deleteCompany } from '@/lib/actions/companies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Search, Trash2, Pencil, Globe, Building2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import type { Company } from '@/lib/db/schema'

type SortKey = 'name' | 'industry' | 'size'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3 w-3 opacity-30 inline ml-1" />
  return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />
}

function CompanyForm({ workspaceId, company, onClose }: {
  workspaceId: string; company?: Company; onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [industry, setIndustry] = useState(company?.industry ?? '')
  const [size, setSize] = useState(company?.size ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = form.get('name') as string
    if (!name.trim()) { setErrors({ name: 'Company name is required' }); return }
    const data = {
      workspaceId,
      name,
      website: (form.get('website') as string) || undefined,
      industry: industry || undefined,
      size: size || undefined,
      notes: (form.get('notes') as string) || undefined,
    }
    startTransition(async () => {
      try {
        if (company) await updateCompany(company.id, data)
        else await createCompany(data)
        toast.success(company ? 'Account updated' : 'Account created')
        onClose()
      } catch { toast.error('Failed to save account') }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Company name</Label>
        <Input id="name" name="name" defaultValue={company?.name} required />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" placeholder="https://" defaultValue={company?.website ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label>Industry</Label>
        <Select value={industry} onValueChange={v => setIndustry(v ?? '')}>
          <SelectTrigger><SelectValue placeholder="Select industry…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {['Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Manufacturing', 'Real Estate', 'Marketing', 'Consulting', 'Other'].map(i => (
              <SelectItem key={i} value={i}>{i}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Company size</Label>
        <Select value={size} onValueChange={v => setSize(v ?? '')}>
          <SelectTrigger><SelectValue placeholder="Select size…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Unknown</SelectItem>
            {['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'].map(s => (
              <SelectItem key={s} value={s}>{s} employees</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} placeholder="Any notes about this account…" defaultValue={company?.notes ?? ''} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  )
}

interface Props { companies: Company[]; workspaceId: string }

export function AccountsClient({ companies, workspaceId }: Props) {
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Company | undefined>()
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let list = companies.filter(a =>
      `${a.name} ${a.industry ?? ''} ${a.size ?? ''}`.toLowerCase().includes(search.toLowerCase())
    )
    list = [...list].sort((a, b) => {
      const av = (sortKey === 'name' ? a.name : sortKey === 'industry' ? (a.industry ?? '') : (a.size ?? ''))
      const bv = (sortKey === 'name' ? b.name : sortKey === 'industry' ? (b.industry ?? '') : (b.size ?? ''))
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return list
  }, [companies, search, sortKey, sortDir])

  function handleDelete(id: string) {
    if (!confirm('Delete this account?')) return
    startTransition(async () => {
      try { await deleteCompany(id); toast.success('Account deleted') }
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
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search accounts…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => { setEditing(undefined); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />Add Account
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">{filtered.length} account{filtered.length !== 1 ? 's' : ''}</div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <ThHead col="name">Name</ThHead>
              <TableHead>Website</TableHead>
              <ThHead col="industry">Industry</ThHead>
              <ThHead col="size">Size</ThHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No accounts found.</TableCell></TableRow>
            )}
            {filtered.map(a => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link href={`/accounts/${a.id}`} className="flex items-center gap-2 font-medium hover:underline">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{a.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {a.website
                    ? <a href={a.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:underline">
                      <Globe className="h-3 w-3 shrink-0" />{a.website.replace(/^https?:\/\/(www\.)?/, '')}
                    </a>
                    : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">{a.industry ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{a.size ? `${a.size} employees` : '—'}</TableCell>
                <TableCell className="max-w-[200px]">
                  {a.notes
                    ? <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{a.notes}</span>
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setDialogOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(a.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Account' : 'New Account'}</DialogTitle></DialogHeader>
          <CompanyForm workspaceId={workspaceId} company={editing} onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
