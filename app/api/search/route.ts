import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getWorkspaceId, globalSearch } from '@/lib/db/queries'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ contacts: [], deals: [], projects: [] })

  const workspaceId = await getWorkspaceId(session.user.id)
  if (!workspaceId) return NextResponse.json({ contacts: [], deals: [], projects: [] })

  const results = await globalSearch(workspaceId, q)
  return NextResponse.json(results)
}
