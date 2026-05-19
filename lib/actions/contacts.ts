'use server'

import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function createContact(data: {
  workspaceId: string; firstName: string; lastName: string
  email?: string; phone?: string; accountId?: string; status?: string
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
