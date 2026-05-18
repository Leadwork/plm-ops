'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { Contact, Account } from '@/lib/types'

interface ContactFormProps {
  workspaceId: string
  accounts: Account[]
  contact?: Contact
  onClose: () => void
}

const STATUSES = ['lead', 'prospect', 'customer', 'churned']

export function ContactForm({ workspaceId, accounts, contact, onClose }: ContactFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(contact?.status ?? 'lead')
  const [accountId, setAccountId] = useState(contact?.account_id ?? '')

  function handleStatusChange(v: string | null) { if (v) setStatus(v) }
  function handleAccountChange(v: string | null) { setAccountId(v ?? '') }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)

    const payload = {
      workspace_id: workspaceId,
      first_name: form.get('first_name') as string,
      last_name: form.get('last_name') as string,
      email: (form.get('email') as string) || null,
      phone: (form.get('phone') as string) || null,
      status,
      account_id: accountId || null,
    }

    const { error } = contact
      ? await supabase.from('contacts').update(payload).eq('id', contact.id)
      : await supabase.from('contacts').insert(payload)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(contact ? 'Contact updated' : 'Contact created')
      router.refresh()
      onClose()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="first_name">First name</Label>
          <Input id="first_name" name="first_name" defaultValue={contact?.first_name} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name">Last name</Label>
          <Input id="last_name" name="last_name" defaultValue={contact?.last_name} required />
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
        <Label>Status</Label>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Account</Label>
        <Select value={accountId} onValueChange={handleAccountChange}>
          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  )
}
