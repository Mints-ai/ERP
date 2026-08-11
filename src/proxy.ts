import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // We only want to protect the dashboard routes for employees
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // Check for our custom auth-token cookie set by AuthContext
    const token = request.cookies.get('auth-token')?.value;

    // If no token exists, the user is unauthenticated
    if (!token) {
      // Redirect them to the login page
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Continue the request if authenticated or if not on a protected route
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
