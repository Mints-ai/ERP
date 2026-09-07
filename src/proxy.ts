import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isJwtOrSessionToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  // Must be a valid 3-part JWT or a session token
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      if (payload && payload.exp && typeof payload.exp === 'number') {
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
          return false; // Expired
        }
      }
      return !!(payload.sub || payload.user_id || payload.uid || payload.email || payload.auth_time);
    } catch {
      return false;
    }
  }
  // If not standard JWT, accept high-entropy session cookie tokens (>= 20 chars)
  return token.length >= 20;
}


export function proxy(request: NextRequest) {
  // We only want to protect the dashboard routes for employees
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const sessionCookie = request.cookies.get('session')?.value || request.cookies.get('auth-token')?.value;

    // If no valid session token exists, the user is unauthenticated
    if (!sessionCookie || !isJwtOrSessionToken(sessionCookie)) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      // Clear any invalid client-set forged cookie
      if (sessionCookie) {
        response.cookies.set('auth-token', '', { maxAge: 0, path: '/' });
        response.cookies.set('session', '', { maxAge: 0, path: '/' });
      }
      return response;
    }
  }

  // Continue the request if authenticated or if not on a protected route
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
