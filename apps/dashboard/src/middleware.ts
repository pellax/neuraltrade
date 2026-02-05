/**
 * Next.js Middleware
 * Protects dashboard routes - requires authentication
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard'];

// Routes that should redirect to dashboard if authenticated
const AUTH_ROUTES = ['/auth/login', '/auth/register'];

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/api',
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip API routes and public assets
    if (
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname.includes('.') // Static files
    ) {
        return NextResponse.next();
    }

    // Check for access token in cookies or localStorage (via header)
    // Note: We use a cookie for SSR compatibility
    const accessToken = request.cookies.get('accessToken')?.value;

    // Check if route is protected
    const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
        pathname.startsWith(route)
    );

    // Check if route is auth route
    const isAuthRoute = AUTH_ROUTES.some((route) =>
        pathname.startsWith(route)
    );

    // Redirect unauthenticated users from protected routes
    if (isProtectedRoute && !accessToken) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Redirect authenticated users from auth routes to dashboard
    if (isAuthRoute && accessToken) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Redirect root to dashboard or login
    if (pathname === '/') {
        if (accessToken) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public folder)
         */
        '/((?!_next/static|_next/image|favicon.ico|public).*)',
    ],
};
