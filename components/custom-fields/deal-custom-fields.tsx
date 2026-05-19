'use client'

import { useState, useEffect, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Check, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import type { CustomFieldDefinition } from '@/lib/db/schema'

interface Props {
  dealId: string | null
  fields: CustomFieldDefinition[]
}

function DealFieldInput({ field, entityId, initialValue }: {
  field: CustomFieldDefinition; entityId: string; initialValue: string
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(initialValue)
  const [, startTransition] = useTransition()
  const options: string[] = field.options ? JSON.parse(field.options) : []

  function save(newVal: string) {
    setVal(newVal)
    setEditing(false)
    startTransition(async () => {
      try {
        await fetch('/api/custom-field-values', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entityId, fieldDefId: field.id, value: newVal }),
        })
        toast.success('Saved')
      } catch { toast.error('Failed to save') }
    })
  }

  if (field.fieldType === 'select') {
    return (
      <Select value={val} onValueChange={v => save(v ?? '')}>
        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="">—</SelectItem>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    )
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : field.fieldType === 'url' ? 'url' : 'text'}
          className="h-8 text-sm"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(val); if (e.key === 'Escape') setEditing(false) }}
        />
        <button onClick={() => save(val)} className="p-1 rounded hover:bg-accent">
          <Check className="h-3.5 w-3.5 text-green-600" />
        </button>
      </div>
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="flex items-center gap-2 group cursor-pointer min-h-[32px] px-2 py-1 rounded hover:bg-accent/50 transition-colors"
    >
      {val ? (
        field.fieldType === 'url'
          ? <a href={val} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-sm text-violet-600 hover:underline truncate">{val}</a>
          : <span className="text-sm">{val}</span>
      ) : (
        <span className="text-sm text-muted-foreground/50">Click to add…</span>
      )}
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 ml-auto shrink-0" />
    </div>
  )
}

export function DealCustomFields({ dealId, fields }: Props) {
  const [valueMap, setValueMap] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!dealId) { setLoaded(true); return }
    fetch(`/api/custom-field-values?entityId=${dealId}`)
      .then(r => r.json())
      .then((data: { fieldDefId: string; value: string | null }[]) => {
        setValueMap(Object.fromEntries(data.map(v => [v.fieldDefId, v.value ?? ''])))
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [dealId])

  if (!loaded || !fields.length) return null

  return (
    <div className="space-y-3 pt-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom Fields</p>
      {fields.map(field => (
        <div key={field.id}>
          <p className="text-xs font-medium text-muted-foreground mb-1">{field.label}</p>
          {dealId
            ? <DealFieldInput field={field} entityId={dealId} initialValue={valueMap[field.id] ?? ''} />
            : <p className="text-xs text-muted-foreground px-2">Save deal first to set custom fields</p>
          }
        </div>
      ))}
    </div>
  )
}
