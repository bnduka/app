
import { withAuth } from 'next-auth/middleware';
import { NextRequest, NextResponse } from 'next/server';
// import { SessionActivityManager } from './lib/security/session-activity-manager';

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth?.token;

    // Skip middleware for auth-related pages and API routes
    if (
      req.nextUrl.pathname.startsWith('/api/auth') ||
      req.nextUrl.pathname.startsWith('/api/demo') ||
      req.nextUrl.pathname.startsWith('/login') ||
      req.nextUrl.pathname.startsWith('/register') ||
      req.nextUrl.pathname.startsWith('/forgot-password') ||
      req.nextUrl.pathname.startsWith('/reset-password') ||
      req.nextUrl.pathname.startsWith('/verify-email') ||
      req.nextUrl.pathname.startsWith('/credential-verification') ||
      req.nextUrl.pathname === '/'
    ) {
      return NextResponse.next();
    }

    // Check if user is authenticated
    if (!token) {
      const url = new URL('/login', req.url);
      url.searchParams.set('callbackUrl', req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    const userId = token.sub!;

    // TEMPORARILY COMMENTED OUT FOR DEBUGGING
    // Update user activity
    // await SessionActivityManager.updateUserActivity(userId);

    // Check session expiry for authenticated users
    // const isExpired = await SessionActivityManager.checkSessionExpiry(
    //   userId,
    //   token.organizationId as string
    // );

    // if (isExpired) {
    //   await SessionActivityManager.expireUserSession(userId, 'TIMEOUT');
    //   const url = new URL('/', req.url);
    //   url.searchParams.set('session', 'expired');
    //   return NextResponse.redirect(url);
    // }

    // Email verification check removed - users can access app without verification

    // Role-based access control
    const userRole = token.role as string;
    
    // Restrict admin routes
    if (req.nextUrl.pathname.startsWith('/admin') && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Restrict business admin routes
    if (
      req.nextUrl.pathname.startsWith('/business-admin') &&
      !['ADMIN', 'BUSINESS_ADMIN'].includes(userRole)
    ) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public pages
        if (
          req.nextUrl.pathname === '/' ||
          req.nextUrl.pathname.startsWith('/api/auth') ||
          req.nextUrl.pathname.startsWith('/api/demo') ||
          req.nextUrl.pathname.startsWith('/login') ||
          req.nextUrl.pathname.startsWith('/register') ||
          req.nextUrl.pathname.startsWith('/forgot-password') ||
          req.nextUrl.pathname.startsWith('/reset-password') ||
          req.nextUrl.pathname.startsWith('/verify-email') ||
          req.nextUrl.pathname.startsWith('/credential-verification')
        ) {
          return true;
        }

        // Require authentication for all other pages
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
};
