'use client'

import { useState, useTransition } from 'react'
import { upsertCustomFieldValue } from '@/lib/actions/custom-fields'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Check, Pencil, Settings } from 'lucide-react'
import Link from 'next/link'
import type { CustomFieldDefinition, CustomFieldValue } from '@/lib/db/schema'

interface Props {
  entityId: string
  fields: CustomFieldDefinition[]
  values: CustomFieldValue[]
  entityType: string
}

function FieldInput({
  field, currentValue, entityId,
}: { field: CustomFieldDefinition; currentValue: string; entityId: string }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(currentValue)
  const [, startTransition] = useTransition()
  const options: string[] = field.options ? JSON.parse(field.options) : []

  function save(newVal: string) {
    setVal(newVal)
    setEditing(false)
    startTransition(async () => {
      try {
        await upsertCustomFieldValue(entityId, field.id, newVal)
        toast.success('Saved')
      } catch { toast.error('Failed to save') }
    })
  }

  if (field.fieldType === 'select') {
    return (
      <Select value={val} onValueChange={v => save(v ?? '')}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
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
      className="flex items-center gap-2 group cursor-pointer min-h-[32px] px-2 py-1 rounded hover:bg-accent/50 transition-colors"
      onClick={() => setEditing(true)}
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

export function CustomFieldsSection({ entityId, fields, values, entityType }: Props) {
  if (fields.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">No custom fields yet.</p>
        <Link href="/settings?tab=custom-fields" className="text-xs text-violet-600 hover:underline inline-flex items-center gap-1 mt-1">
          <Settings className="h-3 w-3" /> Add fields in Settings
        </Link>
      </div>
    )
  }

  const valueMap = Object.fromEntries(values.map(v => [v.fieldDefId, v.value ?? '']))

  return (
    <div className="space-y-3">
      {fields.map(field => (
        <div key={field.id}>
          <p className="text-xs font-medium text-muted-foreground mb-1">{field.label}</p>
          <FieldInput field={field} currentValue={valueMap[field.id] ?? ''} entityId={entityId} />
        </div>
      ))}
    </div>
  )
}
