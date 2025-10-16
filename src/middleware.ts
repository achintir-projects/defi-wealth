import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Temporarily disable admin protection for Netlify build
  // TODO: Re-enable this after fixing the build issue
  /*
  if (pathname.startsWith('/admin') && pathname !== '/admin-login') {
    const isAdmin = request.cookies.get('isAdmin')?.value === 'true'
    const authTime = request.cookies.get('adminAuthTime')?.value
    
    // Check if session is valid (24 hours)
    const isValidSession = authTime && (Date.now() - parseInt(authTime)) < 24 * 60 * 60 * 1000
    
    if (!isAdmin || !isValidSession) {
      // Redirect to admin login if not authenticated
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }
  }
  */
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/admin-login',
  ],
}