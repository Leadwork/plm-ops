import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { notificationChannels } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { channelId } = await req.json()
  const [channel] = await db.select().from(notificationChannels)
    .where(and(eq(notificationChannels.id, channelId), eq(notificationChannels.userId, session.user.id)))
    .limit(1)

  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const config: Record<string, string> = JSON.parse(channel.config)

  if (channel.channelType === 'telegram') {
    const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: '✅ <b>ProLeadMaker</b>\n\nYour Telegram notifications are working! You\'ll receive daily task reminders here.',
        parse_mode: 'HTML',
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: err.description ?? 'Telegram error' }, { status: 400 })
    }
  }

  return NextResponse.json({ ok: true })
}
