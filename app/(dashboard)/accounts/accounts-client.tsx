'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createCompany, updateCompany, deleteCompany } from '@/lib/actions/companies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Trash2, Pencil, Globe, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Company } from '@/lib/db/schema'

function CompanyForm({ workspaceId, company, onClose }: {
  workspaceId: string; company?: Company; onClose: () => void
}) {
  const [pending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const data = {
      workspaceId,
      name: form.get('name') as string,
      website: (form.get('website') as string) || undefined,
      industry: (form.get('industry') as string) || undefined,
      size: (form.get('size') as string) || undefined,
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
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" placeholder="https://" defaultValue={company?.website ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="industry">Industry</Label>
        <Input id="industry" name="industry" defaultValue={company?.industry ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="size">Company size</Label>
        <Input id="size" name="size" placeholder="e.g. 1-10, 11-50…" defaultValue={company?.size ?? ''} />
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

  const filtered = companies.filter(a =>
    `${a.name} ${a.industry ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  function handleDelete(id: string) {
    if (!confirm('Delete this account?')) return
    startTransition(async () => {
      try { await deleteCompany(id); toast.success('Account deleted') }
      catch { toast.error('Failed to delete') }
    })
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

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Website</TableHead>
              <TableHead>Industry</TableHead><TableHead>Size</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No accounts found.</TableCell></TableRow>
            )}
            {filtered.map(a => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link href={`/accounts/${a.id}`} className="flex items-center gap-2 font-medium hover:underline">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />{a.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {a.website
                    ? <a href={a.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:underline"><Globe className="h-3 w-3" />{a.website.replace(/^https?:\/\//, '')}</a>
                    : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">{a.industry ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{a.size ?? '—'}</TableCell>
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
