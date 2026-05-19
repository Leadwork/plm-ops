import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f0a1e 0%, #1a0a2e 50%, #0f0a1e 100%)' }}>
      {/* Background glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #e91e8c, transparent)' }} />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo-icon.png" alt="PLM" width={72} height={72} className="object-contain drop-shadow-lg" priority />
          <p className="text-sm text-white/50">CRM · Pipeline · Projects</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  )
}
