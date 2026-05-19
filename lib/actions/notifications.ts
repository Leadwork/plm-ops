'use server'

import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function createNotification(data: {
  workspaceId: string; userId: string; title: string; body?: string; href?: string
}) {
  await db.insert(notifications).values({
    workspaceId: data.workspaceId,
    userId: data.userId,
    title: data.title,
    body: data.body ?? null,
    href: data.href ?? null,
  })
}

export async function markNotificationRead(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id)))
}

export async function markAllRead() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, session.user.id))
  revalidatePath('/', 'layout')
}
