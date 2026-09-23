import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth/jwt'

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isProtectedRoute = path.startsWith('/admin') || path.startsWith('/teacher') || path.startsWith('/student') || path.startsWith('/parent')

  const sessionCookie = request.cookies.get("session")?.value

  // Protected route enforcement
  if (isProtectedRoute) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/login", request.url), 307)
    }

    const payload = await decrypt(sessionCookie)
    if (!payload?.userId) {
      return NextResponse.redirect(new URL("/login", request.url), 307)
    }

    // Role-based route protection
    if (path.startsWith('/admin') && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL("/login", request.url), 307)
    }
    if (path.startsWith('/teacher') && payload.role !== 'TEACHER' && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL("/login", request.url), 307)
    }
    if (path.startsWith('/student') && payload.role !== 'STUDENT' && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL("/login", request.url), 307)
    }

    // Forced password change redirect
    if (payload.needsPasswordChange && path !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", request.url), 307)
    }

    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  }

  // Non-protected routes with active session needing password change
  if (sessionCookie && path !== "/change-password") {
    const payload = await decrypt(sessionCookie)
    if (payload?.needsPasswordChange) {
      return NextResponse.redirect(new URL("/change-password", request.url), 307)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/teacher/:path*',
    '/student/:path*',
    '/parent/:path*',
  ],
}

