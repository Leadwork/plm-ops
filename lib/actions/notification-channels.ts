'use server'

import { db } from '@/lib/db'
import { notificationChannels } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function createNotificationChannel(data: {
  workspaceId: string
  channelType: string
  label: string
  config: Record<string, string>
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.insert(notificationChannels).values({
    workspaceId: data.workspaceId,
    userId: session.user.id,
    channelType: data.channelType,
    label: data.label,
    config: JSON.stringify(data.config),
  })
  revalidatePath('/settings')
}

export async function deleteNotificationChannel(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.delete(notificationChannels).where(
    and(eq(notificationChannels.id, id), eq(notificationChannels.userId, session.user.id))
  )
  revalidatePath('/settings')
}

export async function toggleNotificationChannel(id: string, enabled: boolean) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.update(notificationChannels)
    .set({ enabled })
    .where(and(eq(notificationChannels.id, id), eq(notificationChannels.userId, session.user.id)))
  revalidatePath('/settings')
}
