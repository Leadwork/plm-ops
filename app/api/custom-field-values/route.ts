import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { customFieldValues, customFieldDefinitions } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entityId = req.nextUrl.searchParams.get('entityId')
  if (!entityId) return NextResponse.json([])

  const values = await db.select().from(customFieldValues)
    .where(eq(customFieldValues.entityId, entityId))

  return NextResponse.json(values)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { entityId, fieldDefId, value } = await req.json()
  if (!entityId || !fieldDefId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

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

  return NextResponse.json({ ok: true })
}
