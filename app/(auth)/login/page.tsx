'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)

    const result = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    })

    if (result?.error) {
      toast.error('Invalid email or password')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Welcome back</h2>
        <p className="text-sm text-white/50 mt-0.5">Sign in to your workspace</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-white/70">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required
            className="bg-white/10 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[#7c3aed] focus-visible:border-[#7c3aed]" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-white/70">Password</Label>
          <Input id="password" name="password" type="password" required
            className="bg-white/10 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-[#7c3aed] focus-visible:border-[#7c3aed]" />
        </div>
        <Button type="submit" className="w-full brand-gradient border-0 text-white font-semibold hover:opacity-90 transition-opacity" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="text-center text-sm text-white/40">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-[#c026d3] hover:text-[#e91e8c] font-medium transition-colors">
          Create one
        </Link>
      </p>
    </div>
  )
}
