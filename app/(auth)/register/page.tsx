'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { createUserAndWorkspace } from '@/lib/actions/workspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const name = form.get('name') as string
    const email = form.get('email') as string
    const password = form.get('password') as string

    try {
      await createUserAndWorkspace(name, email, password)
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) throw new Error('Sign-in failed after registration')
      toast.success('Account created!')
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Create account</h2>
        <p className="text-sm text-white/50 mt-0.5">Set up your free workspace in seconds.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-white/70">Full name</Label>
          <Input id="name" name="name" placeholder="Jane Smith" required
            className="bg-white/10 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[#7c3aed] focus-visible:border-[#7c3aed]" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-white/70">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required
            className="bg-white/10 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[#7c3aed] focus-visible:border-[#7c3aed]" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-white/70">Password</Label>
          <Input id="password" name="password" type="password" minLength={8} required
            className="bg-white/10 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[#7c3aed] focus-visible:border-[#7c3aed]" />
        </div>
        <Button type="submit" className="w-full brand-gradient border-0 text-white font-semibold hover:opacity-90 transition-opacity" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="text-center text-sm text-white/40">
        Already have an account?{' '}
        <Link href="/login" className="text-[#c026d3] hover:text-[#e91e8c] font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
