'use client'

import { useState, useTransition } from 'react'
import { updateCompany } from '@/lib/actions/companies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import type { Company } from '@/lib/db/schema'

export function AccountDetailActions({ company }: { company: Company }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await updateCompany(company.id, {
          name: form.get('name') as string,
          website: (form.get('website') as string) || undefined,
          industry: (form.get('industry') as string) || undefined,
          size: (form.get('size') as string) || undefined,
        })
        toast.success('Account updated')
        setOpen(false)
      } catch { toast.error('Failed to update account') }
    })
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit Account
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Company name</Label>
              <Input id="name" name="name" defaultValue={company.name} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" placeholder="https://" defaultValue={company.website ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" name="industry" defaultValue={company.industry ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="size">Company size</Label>
              <Input id="size" name="size" placeholder="e.g. 1-10, 11-50…" defaultValue={company.size ?? ''} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
