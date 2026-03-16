import { NextResponse, type NextRequest } from "next/server"

/**
 * Lightweight middleware that checks for session cookie presence.
 * Full session verification happens in server components via Firebase Admin SDK.
 * This avoids importing firebase-admin which requires Node.js runtime (not Edge).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get("__session")?.value

  // Public paths that don't require authentication
  const publicPaths = ["/", "/auth/login", "/auth/sign-up", "/auth/sign-up-success", "/auth/error", "/pricing"]
  const isPublicPath = publicPaths.some(
    (p) => pathname === p || pathname.startsWith("/api/auth/")
  )
  const isStaticAsset =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)

  if (isStaticAsset) {
    return NextResponse.next()
  }

  // API routes handle their own auth
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  const isAuthenticated = !!sessionCookie

  // Redirect unauthenticated users away from protected routes
  if (!isAuthenticated && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages and home
  if (isAuthenticated && (pathname.startsWith("/auth") || pathname === "/")) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
