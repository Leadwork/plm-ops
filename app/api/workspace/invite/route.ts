import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, workspaceId } = await request.json()
  const supabase = await createClient()

  // Send a magic link / invite via Supabase Auth
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { workspace_id: workspaceId },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/auth/callback?next=/dashboard`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
