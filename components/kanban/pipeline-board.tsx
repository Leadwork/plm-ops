'use client'

import { useState, useCallback } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { Stage, Deal, Contact, Account } from '@/lib/types'

type DealWithRelations = Deal & {
  contacts: { first_name: string; last_name: string } | null
  accounts: { name: string } | null
}

interface PipelineBoardProps {
  stages: Stage[]
  deals: DealWithRelations[]
  contacts: Contact[]
  accounts: Account[]
  workspaceId: string
  pipelineId: string
}

function DealCard({ deal, onEdit, onDelete }: { deal: DealWithRelations; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="bg-background border rounded-lg p-3 shadow-sm group">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{deal.title}</p>
          {deal.contacts && (
            <p className="text-xs text-muted-foreground">{deal.contacts.first_name} {deal.contacts.last_name}</p>
          )}
          {deal.accounts && <p className="text-xs text-muted-foreground">{deal.accounts.name}</p>}
          {deal.value != null && (
            <p className="text-xs font-semibold text-green-600 mt-1">${deal.value.toLocaleString()}</p>
          )}
          {deal.close_date && (
            <p className="text-xs text-muted-foreground">Close: {new Date(deal.close_date).toLocaleDateString()}</p>
          )}
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onDelete}><Trash2 className="h-3 w-3 text-destructive" /></Button>
        </div>
      </div>
    </div>
  )
}

function DealForm({ workspaceId, pipelineId, stages, contacts, accounts, deal, defaultStageId, onClose }: {
  workspaceId: string; pipelineId: string; stages: Stage[]
  contacts: Contact[]; accounts: Account[]
  deal?: DealWithRelations; defaultStageId?: string; onClose: () => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [stageId, setStageId] = useState(deal?.stage_id ?? defaultStageId ?? stages[0]?.id ?? '')
  const [contactId, setContactId] = useState(deal?.contact_id ?? '')
  const [accountId, setAccountId] = useState(deal?.account_id ?? '')

  function handleStageChange(v: string | null) { if (v) setStageId(v) }
  function handleContactChange(v: string | null) { setContactId(v ?? '') }
  function handleAccountChange(v: string | null) { setAccountId(v ?? '') }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const payload = {
      workspace_id: workspaceId,
      pipeline_id: pipelineId,
      stage_id: stageId,
      title: form.get('title') as string,
      value: form.get('value') ? Number(form.get('value')) : null,
      close_date: (form.get('close_date') as string) || null,
      contact_id: contactId || null,
      account_id: accountId || null,
      status: 'open' as const,
    }
    const { error } = deal
      ? await supabase.from('deals').update(payload).eq('id', deal.id)
      : await supabase.from('deals').insert(payload)
    if (error) toast.error(error.message)
    else { toast.success(deal ? 'Deal updated' : 'Deal created'); router.refresh(); onClose() }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Deal title</Label>
        <Input name="title" defaultValue={deal?.title} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Value ($)</Label>
          <Input name="value" type="number" min="0" defaultValue={deal?.value ?? ''} />
        </div>
        <div className="space-y-1.5">
          <Label>Close date</Label>
          <Input name="close_date" type="date" defaultValue={deal?.close_date?.slice(0, 10) ?? ''} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Stage</Label>
        <Select value={stageId} onValueChange={handleStageChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Contact</Label>
        <Select value={contactId} onValueChange={handleContactChange}>
          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
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

export function PipelineBoard({ stages, deals: initialDeals, contacts, accounts, workspaceId, pipelineId }: PipelineBoardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [deals, setDeals] = useState(initialDeals)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<DealWithRelations | undefined>()
  const [defaultStageId, setDefaultStageId] = useState<string | undefined>()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const dealsForStage = useCallback((stageId: string) =>
    deals.filter(d => d.stage_id === stageId), [deals])

  const stageValue = useCallback((stageId: string) =>
    dealsForStage(stageId).reduce((sum, d) => sum + (d.value ?? 0), 0), [dealsForStage])

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    const draggedDeal = deals.find(d => d.id === active.id)
    if (!draggedDeal) return

    // over.id can be a stage id or a deal id — find the target stage
    const targetStage = stages.find(s => s.id === over.id)
    const targetDeal = deals.find(d => d.id === over.id)
    const newStageId = targetStage?.id ?? targetDeal?.stage_id

    if (!newStageId || newStageId === draggedDeal.stage_id) return

    setDeals(prev => prev.map(d => d.id === draggedDeal.id ? { ...d, stage_id: newStageId } : d))

    const { error } = await supabase.from('deals').update({ stage_id: newStageId }).eq('id', draggedDeal.id)
    if (error) {
      toast.error('Failed to move deal')
      setDeals(initialDeals)
    } else {
      router.refresh()
    }
  }

  async function deleteDeal(id: string) {
    if (!confirm('Delete this deal?')) return
    const { error } = await supabase.from('deals').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Deal deleted'); router.refresh() }
  }

  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {stages.map(stage => (
          <div key={stage.id} className="flex flex-col min-w-[280px] max-w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm font-semibold">{stage.name}</span>
                <Badge variant="secondary" className="ml-2 text-xs">{dealsForStage(stage.id).length}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">${stageValue(stage.id).toLocaleString()}</div>
            </div>

            <div
              className="flex-1 rounded-lg bg-muted/40 p-2 space-y-2 min-h-[200px]"
              onDragOver={e => e.preventDefault()}
              data-stage-id={stage.id}
            >
              <SortableContext items={dealsForStage(stage.id).map(d => d.id)} strategy={verticalListSortingStrategy}>
                {dealsForStage(stage.id).map(deal => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onEdit={() => { setEditingDeal(deal); setDialogOpen(true) }}
                    onDelete={() => deleteDeal(deal.id)}
                  />
                ))}
              </SortableContext>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => { setEditingDeal(undefined); setDefaultStageId(stage.id); setDialogOpen(true) }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />Add deal
              </Button>
            </div>
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeDeal && (
          <div className="bg-background border rounded-lg p-3 shadow-lg rotate-2 w-[260px]">
            <p className="text-sm font-medium">{activeDeal.title}</p>
            {activeDeal.value != null && <p className="text-xs text-green-600 font-semibold">${activeDeal.value.toLocaleString()}</p>}
          </div>
        )}
      </DragOverlay>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDeal ? 'Edit Deal' : 'New Deal'}</DialogTitle>
          </DialogHeader>
          <DealForm
            workspaceId={workspaceId}
            pipelineId={pipelineId}
            stages={stages}
            contacts={contacts}
            accounts={accounts}
            deal={editingDeal}
            defaultStageId={defaultStageId}
            onClose={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </DndContext>
  )
}
