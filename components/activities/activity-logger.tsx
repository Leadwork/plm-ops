'use client'

import { useState, useTransition } from 'react'
import { createActivity } from '@/lib/actions/activities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'task']

interface Props {
  workspaceId: string
  contactId?: string
  companyId?: string
  dealId?: string
}

export function ActivityLogger({ workspaceId, contactId, companyId, dealId }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [type, setType] = useState('call')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(subject: string) {
    const e: Record<string, string> = {}
    if (!subject.trim()) e.subject = 'Subject is required'
    setErrors(e)
    return !Object.keys(e).length
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const subject = form.get('subject') as string
    if (!validate(subject)) return
    startTransition(async () => {
      try {
        await createActivity({
          workspaceId, type,
          subject: subject.trim(),
          notes: (form.get('notes') as string) || undefined,
          contactId, companyId, dealId,
        })
        toast.success('Activity logged')
        setOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to log activity')
      }
    })
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5 mr-1" />Log Activity
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={v => { if (v) setType(v) }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input name="subject" placeholder="e.g. Intro call with Jane" required />
              {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea name="notes" rows={3} placeholder="What was discussed?" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Log Activity'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
