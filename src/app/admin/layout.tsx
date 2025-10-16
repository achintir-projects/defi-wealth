import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Toaster } from "@/components/ui/toaster"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Skip authentication during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return (
      <>
        {children}
        <Toaster />
      </>
    )
  }

  const cookieStore = await cookies()
  const isAdmin = cookieStore.get('isAdmin')?.value === 'true'
  const authTime = cookieStore.get('adminAuthTime')?.value
  
  // Check if session is valid (24 hours)
  const isValidSession = authTime && (Date.now() - parseInt(authTime)) < 24 * 60 * 60 * 1000
  
  if (!isAdmin || !isValidSession) {
    redirect('/admin-login')
  }
  
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}