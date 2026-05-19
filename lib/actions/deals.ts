'use server'

import { db } from '@/lib/db'
import { deals } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function createDeal(data: {
  workspaceId: string; pipelineId: string; stageId: string; title: string
  value?: number; contactId?: string; companyId?: string; closeDate?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.insert(deals).values({
    ...data,
    value: data.value?.toString(),
    ownerId: session.user.id,
    status: 'open',
  })
  revalidatePath('/pipeline')
}

export async function updateDeal(id: string, data: Partial<typeof deals.$inferInsert>) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.update(deals).set(data).where(eq(deals.id, id))
  revalidatePath('/pipeline')
}

export async function moveDeal(id: string, stageId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.update(deals).set({ stageId }).where(eq(deals.id, id))
  revalidatePath('/pipeline')
}

export async function closeDeal(id: string, status: 'won' | 'lost') {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.update(deals).set({ status }).where(eq(deals.id, id))
  revalidatePath('/pipeline')
}

export async function deleteDeal(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.delete(deals).where(eq(deals.id, id))
  revalidatePath('/pipeline')
}
