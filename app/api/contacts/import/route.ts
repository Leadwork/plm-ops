import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getWorkspaceId } from '@/lib/db/queries'
import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = await getWorkspaceId(session.user.id)
  if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 })

  const text = await req.text()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 })

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))

  const idx = {
    firstName: headers.findIndex(h => h.includes('first')),
    lastName: headers.findIndex(h => h.includes('last')),
    email: headers.findIndex(h => h.includes('email')),
    phone: headers.findIndex(h => h.includes('phone')),
    status: headers.findIndex(h => h.includes('status')),
  }

  if (idx.firstName === -1 || idx.lastName === -1) {
    return NextResponse.json({ error: 'CSV must have "first_name" and "last_name" columns' }, { status: 400 })
  }

  const rows = lines.slice(1)
  const toInsert = rows.map(row => {
    const cells = parseCSVRow(row)
    return {
      workspaceId,
      firstName: cells[idx.firstName]?.trim() || 'Unknown',
      lastName: cells[idx.lastName]?.trim() || '',
      email: idx.email >= 0 ? (cells[idx.email]?.trim() || null) : null,
      phone: idx.phone >= 0 ? (cells[idx.phone]?.trim() || null) : null,
      status: idx.status >= 0 ? (cells[idx.status]?.trim() || 'lead') : 'lead',
      ownerId: session.user!.id,
    }
  }).filter(r => r.firstName !== 'Unknown' || r.lastName)

  if (!toInsert.length) return NextResponse.json({ error: 'No valid rows found' }, { status: 400 })

  await db.insert(contacts).values(toInsert)

  return NextResponse.json({ imported: toInsert.length })
}

function parseCSVRow(row: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < row.length; i++) {
    const ch = row[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(cur); cur = '' }
    else { cur += ch }
  }
  result.push(cur)
  return result.map(c => c.replace(/^"|"$/g, ''))
}
