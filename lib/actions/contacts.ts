'use server'

import { db } from '@/lib/db'
import { contacts, tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function createContact(data: {
  workspaceId: string; firstName: string; lastName: string
  email?: string; phone?: string; accountId?: string; status?: string
  title?: string; notes?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.insert(contacts).values({ ...data, ownerId: session.user.id })
  revalidatePath('/contacts')
}

export async function updateContact(id: string, data: Partial<typeof contacts.$inferInsert>) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.update(contacts).set(data).where(eq(contacts.id, id))
  revalidatePath('/contacts')
}

export async function deleteContact(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.delete(contacts).where(eq(contacts.id, id))
  revalidatePath('/contacts')
}

export async function scheduleFollowUp(data: {
  workspaceId: string; contactId: string; contactName: string
  type: string; dueDate: string; dueTime?: string; note?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const title = `Follow up with ${data.contactName} — ${data.type}`
  await db.insert(tasks).values({
    workspaceId: data.workspaceId,
    title,
    description: data.note ?? null,
    status: 'todo',
    priority: 'medium',
    assigneeId: session.user.id,
    dueDate: data.dueDate,
    dueTime: data.dueTime || null,
  })
  revalidatePath('/tasks')
  revalidatePath('/contacts')
}
