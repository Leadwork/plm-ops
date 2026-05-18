import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { name, userId, fullName } = await request.json()
  const supabase = await createClient()

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 50)

  // Create workspace
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({ name, slug })
    .select()
    .single()

  if (wsError) return NextResponse.json({ error: wsError.message }, { status: 500 })

  // Add owner as admin member
  await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: userId,
    role: 'admin',
  })

  // Create profile
  await supabase.from('profiles').upsert({
    id: userId,
    full_name: fullName,
    workspace_id: workspace.id,
  })

  // Seed default pipeline
  const { data: pipeline } = await supabase
    .from('pipelines')
    .insert({ workspace_id: workspace.id, name: 'Sales Pipeline', is_default: true })
    .select()
    .single()

  if (pipeline) {
    const defaultStages = [
      { name: 'Lead', position: 0, probability: 10 },
      { name: 'Qualified', position: 1, probability: 25 },
      { name: 'Proposal', position: 2, probability: 50 },
      { name: 'Negotiation', position: 3, probability: 75 },
      { name: 'Won', position: 4, probability: 100 },
    ]
    await supabase.from('stages').insert(
      defaultStages.map(s => ({ ...s, pipeline_id: pipeline.id }))
    )
  }

  return NextResponse.json({ workspace })
}
