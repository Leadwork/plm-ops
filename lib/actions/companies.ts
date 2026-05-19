'use server'

import { db } from '@/lib/db'
import { companies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function createCompany(data: {
  workspaceId: string; name: string; website?: string; industry?: string; size?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.insert(companies).values({ ...data, ownerId: session.user.id })
  revalidatePath('/accounts')
}

export async function updateCompany(id: string, data: Partial<typeof companies.$inferInsert>) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.update(companies).set(data).where(eq(companies.id, id))
  revalidatePath('/accounts')
}

export async function deleteCompany(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  await db.delete(companies).where(eq(companies.id, id))
  revalidatePath('/accounts')
}
