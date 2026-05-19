'use server'

import { db } from '@/lib/db'
import { deals, notifications, workspaceMembers } from '@/lib/db/schema'
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

  const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1)
  await db.update(deals).set({ status }).where(eq(deals.id, id))

  if (deal) {
    const emoji = status === 'won' ? '🏆' : '❌'
    const members = await db.select({ userId: workspaceMembers.userId })
      .from(workspaceMembers).where(eq(workspaceMembers.workspaceId, deal.workspaceId))
    await db.insert(notifications).values(
      members.map(m => ({
        workspaceId: deal.workspaceId,
        userId: m.userId,
        title: `${emoji} Deal ${status}: ${deal.title}`,
        body: deal.value ? `Value: $${Number(deal.value).toLocaleString()}` : undefined,
        href: '/pipeline',
      }))
    )
  }

  revalidatePath('/pipeline')
}

export async function deleteDeal(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.delete(deals).where(eq(deals.id, id))
  revalidatePath('/pipeline')
}
