'use client'

import { useState, useCallback, useTransition } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format } from 'date-fns'
import { createDeal, updateDeal, moveDeal, deleteDeal, closeDeal } from '@/lib/actions/deals'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, GripVertical, Pencil, Trash2, Trophy, X, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { DealCustomFields } from '@/components/custom-fields/deal-custom-fields'
import type { Stage, CustomFieldDefinition } from '@/lib/db/schema'

type DealRow = {
  id: string; title: string; value: string | null; status: string
  stageId: string; closeDate: string | null
  contactFirstName: string | null; contactLastName: string | null; companyName: string | null
}

type ContactRow = { id: string; firstName: string; lastName: string }
type CompanyRow = { id: string; name: string }

interface PipelineBoardProps {
  stages: Stage[]
  deals: DealRow[]
  contacts: ContactRow[]
  companies: CompanyRow[]
  workspaceId: string
  pipelineId: string
  dealFields?: CustomFieldDefinition[]
}

function DealCard({ deal, onEdit, onDelete, onWon, onLost }: {
  deal: DealRow; onEdit: () => void; onDelete: () => void; onWon: () => void; onLost: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const isWon = deal.status === 'won'
  const isLost = deal.status === 'lost'

  return (
    <div ref={setNodeRef} style={style}
      className={`bg-background border rounded-lg p-3 shadow-sm group ${isWon ? 'border-green-300 bg-green-50/50' : isLost ? 'border-red-200 bg-red-50/50 opacity-60' : ''}`}>
      <div className="flex items-start gap-2">
        {!isWon && !isLost && (
          <button {...attributes} {...listeners}
            className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">{deal.title}</p>
            {isWon && <Badge className="text-[10px] py-0 bg-green-100 text-green-700 border-green-200">Won</Badge>}
            {isLost && <Badge className="text-[10px] py-0 bg-red-100 text-red-600 border-red-200">Lost</Badge>}
          </div>
          {deal.contactFirstName && (
            <p className="text-xs text-muted-foreground">{deal.contactFirstName} {deal.contactLastName}</p>
          )}
          {deal.companyName && <p className="text-xs text-muted-foreground">{deal.companyName}</p>}
          {deal.value != null && (
            <p className="text-xs font-semibold text-green-600 mt-1">${Number(deal.value).toLocaleString()}</p>
          )}
          {deal.closeDate && (
            <p className="text-xs text-muted-foreground">
              Close: {format(new Date(deal.closeDate), 'MMM d, yyyy')}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {deal.status === 'open' && (
            <>
              <Button size="icon" variant="ghost" className="h-6 w-6" title="Mark Won" onClick={onWon}>
                <Trophy className="h-3 w-3 text-green-600" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" title="Mark Lost" onClick={onLost}>
                <X className="h-3 w-3 text-red-500" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onEdit}>
                <Pencil className="h-3 w-3" />
              </Button>
            </>
          )}
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onDelete}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function DealForm({ workspaceId, pipelineId, stages, contacts, companies, deal, defaultStageId, onClose }: {
  workspaceId: string; pipelineId: string; stages: Stage[]
  contacts: ContactRow[]; companies: CompanyRow[]
  deal?: DealRow; defaultStageId?: string; onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [stageId, setStageId] = useState(deal?.stageId ?? defaultStageId ?? stages[0]?.id ?? '')
  const [contactId, setContactId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(title: string) {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Title is required'
    setErrors(e)
    return !Object.keys(e).length
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const title = form.get('title') as string
    if (!validate(title)) return
    const valueStr = form.get('value') as string
    const data = {
      workspaceId, pipelineId, stageId,
      title,
      value: valueStr ? Number(valueStr) : undefined,
      closeDate: (form.get('close_date') as string) || undefined,
      contactId: contactId || undefined,
      companyId: companyId || undefined,
    }
    startTransition(async () => {
      try {
        if (deal) await updateDeal(deal.id, { stageId, title: data.title, value: data.value?.toString(), closeDate: data.closeDate })
        else await createDeal(data)
        toast.success(deal ? 'Deal updated' : 'Deal created')
        onClose()
      } catch { toast.error('Failed to save deal') }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Deal title</Label>
        <Input name="title" defaultValue={deal?.title} required />
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Value ($)</Label>
          <Input name="value" type="number" min="0" defaultValue={deal?.value ?? ''} />
        </div>
        <div className="space-y-1.5">
          <Label>Close date</Label>
          <Input name="close_date" type="date" defaultValue={deal?.closeDate?.slice(0, 10) ?? ''} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Stage</Label>
        <Select value={stageId} onValueChange={v => { if (v) setStageId(v) }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Contact</Label>
        <Select value={contactId} onValueChange={v => setContactId(v ?? '')}>
          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Account</Label>
        <Select value={companyId} onValueChange={v => setCompanyId(v ?? '')}>
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

export function PipelineBoard({ stages, deals: initialDeals, contacts, companies, workspaceId, pipelineId, dealFields = [] }: PipelineBoardProps) {
  const [, startTransition] = useTransition()
  const [deals, setDeals] = useState(initialDeals)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<DealRow | undefined>()
  const [defaultStageId, setDefaultStageId] = useState<string | undefined>()
  const [showClosed, setShowClosed] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const openDeals = deals.filter(d => d.status === 'open')
  const closedDeals = deals.filter(d => d.status !== 'open')

  const dealsForStage = useCallback((stageId: string) =>
    openDeals.filter(d => d.stageId === stageId), [openDeals])

  const stageValue = useCallback((stageId: string) =>
    dealsForStage(stageId).reduce((sum, d) => sum + Number(d.value ?? 0), 0), [dealsForStage])

  function handleDragStart(event: DragStartEvent) { setActiveId(event.active.id as string) }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return
    const draggedDeal = deals.find(d => d.id === active.id)
    if (!draggedDeal) return
    const targetStage = stages.find(s => s.id === over.id)
    const targetDeal = deals.find(d => d.id === over.id)
    const newStageId = targetStage?.id ?? targetDeal?.stageId
    if (!newStageId || newStageId === draggedDeal.stageId) return
    setDeals(prev => prev.map(d => d.id === draggedDeal.id ? { ...d, stageId: newStageId } : d))
    startTransition(async () => {
      try { await moveDeal(draggedDeal.id, newStageId) }
      catch { toast.error('Failed to move deal'); setDeals(initialDeals) }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this deal?')) return
    startTransition(async () => {
      try { await deleteDeal(id); setDeals(prev => prev.filter(d => d.id !== id)); toast.success('Deal deleted') }
      catch { toast.error('Failed to delete') }
    })
  }

  function handleClose(id: string, status: 'won' | 'lost') {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, status } : d))
    startTransition(async () => {
      try {
        await closeDeal(id, status)
        toast.success(status === 'won' ? '🏆 Deal won!' : 'Deal marked as lost')
      } catch { toast.error('Failed to update deal'); setDeals(initialDeals) }
    })
  }

  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{openDeals.length} open · ${openDeals.reduce((s, d) => s + Number(d.value ?? 0), 0).toLocaleString()} total</span>
          {closedDeals.length > 0 && (
            <span className="text-green-600">{closedDeals.filter(d => d.status === 'won').length} won</span>
          )}
        </div>
        {closedDeals.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowClosed(p => !p)}>
            {showClosed ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {showClosed ? 'Hide' : 'Show'} closed ({closedDeals.length})
          </Button>
        )}
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {stages.map(stage => (
            <div key={stage.id} className="flex flex-col min-w-[280px] max-w-[280px]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm font-semibold">{stage.name}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">{dealsForStage(stage.id).length}</Badge>
                  <span className="ml-1.5 text-xs text-muted-foreground">{stage.probability}%</span>
                </div>
                <div className="text-xs text-muted-foreground font-medium">${stageValue(stage.id).toLocaleString()}</div>
              </div>

              <div className="flex-1 rounded-lg bg-muted/40 p-2 space-y-2 min-h-[200px]" id={stage.id}>
                <SortableContext items={dealsForStage(stage.id).map(d => d.id)} strategy={verticalListSortingStrategy}>
                  {dealsForStage(stage.id).map(deal => (
                    <DealCard key={deal.id} deal={deal}
                      onEdit={() => { setEditingDeal(deal); setDialogOpen(true) }}
                      onDelete={() => handleDelete(deal.id)}
                      onWon={() => handleClose(deal.id, 'won')}
                      onLost={() => handleClose(deal.id, 'lost')}
                    />
                  ))}
                </SortableContext>

                {showClosed && closedDeals.filter(d => d.stageId === stage.id).map(deal => (
                  <DealCard key={deal.id} deal={deal}
                    onEdit={() => { setEditingDeal(deal); setDialogOpen(true) }}
                    onDelete={() => handleDelete(deal.id)}
                    onWon={() => handleClose(deal.id, 'won')}
                    onLost={() => handleClose(deal.id, 'lost')}
                  />
                ))}

                <Button
                  variant="ghost" size="sm"
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
              {activeDeal.value != null && <p className="text-xs text-green-600 font-semibold">${Number(activeDeal.value).toLocaleString()}</p>}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingDeal ? 'Edit Deal' : 'New Deal'}</DialogTitle></DialogHeader>
          <DealForm
            workspaceId={workspaceId} pipelineId={pipelineId} stages={stages}
            contacts={contacts} companies={companies} deal={editingDeal}
            defaultStageId={defaultStageId} onClose={() => setDialogOpen(false)}
          />
          {dealFields.length > 0 && editingDeal && (
            <div className="border-t pt-4">
              <DealCustomFields dealId={editingDeal.id} fields={dealFields} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
