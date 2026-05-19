'use server'

import { db } from '@/lib/db'
import { customFieldDefinitions, customFieldValues } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function createCustomField(data: {
  workspaceId: string
  entityType: string
  label: string
  fieldType: string
  options?: string[]
  position: number
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  if (!data.label.trim()) throw new Error('Label is required')
  await db.insert(customFieldDefinitions).values({
    workspaceId: data.workspaceId,
    entityType: data.entityType,
    label: data.label.trim(),
    fieldType: data.fieldType,
    options: data.options?.length ? JSON.stringify(data.options) : null,
    position: data.position,
  })
  revalidatePath('/settings')
  revalidatePath('/contacts', 'layout')
  revalidatePath('/accounts', 'layout')
  revalidatePath('/pipeline')
}

export async function deleteCustomField(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.delete(customFieldDefinitions).where(eq(customFieldDefinitions.id, id))
  revalidatePath('/settings')
  revalidatePath('/contacts', 'layout')
  revalidatePath('/accounts', 'layout')
  revalidatePath('/pipeline')
}

export async function upsertCustomFieldValue(entityId: string, fieldDefId: string, value: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const existing = await db.select({ id: customFieldValues.id })
    .from(customFieldValues)
    .where(and(eq(customFieldValues.entityId, entityId), eq(customFieldValues.fieldDefId, fieldDefId)))
    .limit(1)

  if (existing.length) {
    await db.update(customFieldValues)
      .set({ value, updatedAt: new Date() })
      .where(and(eq(customFieldValues.entityId, entityId), eq(customFieldValues.fieldDefId, fieldDefId)))
  } else {
    await db.insert(customFieldValues).values({ entityId, fieldDefId, value })
  }
}
