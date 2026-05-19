'use client'

import { useState, useTransition } from 'react'
import { updateContact, scheduleFollowUp } from '@/lib/actions/contacts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pencil, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import type { Contact, Company } from '@/lib/db/schema'

export function FollowUpButton({ contact, workspaceId }: { contact: Contact; workspaceId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [type, setType] = useState('Call')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const dueDate = form.get('due_date') as string
    const dueTime = form.get('due_time') as string
    const note = form.get('note') as string
    if (!dueDate) return
    startTransition(async () => {
      try {
        await scheduleFollowUp({
          workspaceId,
          contactId: contact.id,
          contactName: `${contact.firstName} ${contact.lastName}`,
          type,
          dueDate,
          dueTime: dueTime || undefined,
          note: note || undefined,
        })
        toast.success('Follow-up scheduled')
        setOpen(false)
      } catch { toast.error('Failed to schedule') }
    })
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <CalendarClock className="h-3.5 w-3.5 mr-1.5" />Schedule Follow-up
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Follow-up</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={v => { if (v) setType(v) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Call', 'Email', 'Meeting', 'Demo', 'Check-in'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="due_date">Due date</Label>
                <Input id="due_date" name="due_date" type="date" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="due_time">Time <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input id="due_time" name="due_time" type="time" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea id="note" name="note" rows={2} placeholder="What to discuss…" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? 'Scheduling…' : 'Schedule'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ContactDetailActions({ contact, companies }: { contact: Contact; companies: Company[] }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState(contact.status)
  const [accountId, setAccountId] = useState(contact.accountId ?? '')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await updateContact(contact.id, {
          firstName: form.get('first_name') as string,
          lastName: form.get('last_name') as string,
          title: (form.get('title') as string) || undefined,
          email: (form.get('email') as string) || undefined,
          phone: (form.get('phone') as string) || undefined,
          linkedinUrl: (form.get('linkedin_url') as string) || undefined,
          notes: (form.get('notes') as string) || undefined,
          status,
          accountId: accountId || undefined,
        })
        toast.success('Contact updated')
        setOpen(false)
      } catch { toast.error('Failed to update contact') }
    })
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit Contact
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Contact</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First name</Label>
                <Input id="first_name" name="first_name" defaultValue={contact.firstName} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last name</Label>
                <Input id="last_name" name="last_name" defaultValue={contact.lastName} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Job title</Label>
              <Input id="title" name="title" placeholder="e.g. CEO, Sales Manager…" defaultValue={contact.title ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={contact.email ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={contact.phone ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input id="linkedin_url" name="linkedin_url" placeholder="https://linkedin.com/in/…" defaultValue={contact.linkedinUrl ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} placeholder="Any notes…" defaultValue={contact.notes ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={v => { if (v) setStatus(v) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['lead', 'prospect', 'customer', 'churned'].map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
