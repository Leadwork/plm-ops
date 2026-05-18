export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">ProLeadMaker</h1>
          <p className="text-sm text-muted-foreground">CRM · Pipeline · Projects</p>
        </div>
        {children}
      </div>
    </div>
  )
}
