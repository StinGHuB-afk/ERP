import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value
  const { pathname, searchParams } = request.nextUrl

  // Protected paths regex
  const isProtectedPath = /^\/(admin|superadmin|teacher|student|parent|librarian)(\/.*)?$/.test(pathname)
  const isAuthPath = pathname.startsWith('/login')

  // If user is trying to access a protected route without a token
  if (isProtectedPath && !token) {
    const loginUrl = new URL('/login', request.url)
    
    // Pass the original URL as callbackUrl
    loginUrl.searchParams.set('callbackUrl', encodeURI(request.url))
    
    // If they previously had a token that is now missing/expired (indicated by trying to access protected route without one, though hard to know if it just expired or they logged out, we can add a flag)
    loginUrl.searchParams.set('session_expired', 'true')
    
    return NextResponse.redirect(loginUrl)
  }

  // If user is trying to access login page WITH a token
  if (isAuthPath && token) {
    // Ideally we verify the token here, but edge runtime can't run bcrypt or some jose easily if not set up.
    // For now, if they have a session cookie, let's redirect them to home page to route them properly.
    const callbackUrl = searchParams.get('callbackUrl')
    if (callbackUrl) {
      return NextResponse.redirect(new URL(decodeURI(callbackUrl)))
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
