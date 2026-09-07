import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const SESSION_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    let idToken = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      idToken = authHeader.split('Bearer ')[1].trim();
    } else {
      const body = await request.json().catch(() => ({}));
      idToken = body.idToken || '';
    }

    if (!idToken) {
      return NextResponse.json({ error: 'Missing ID token' }, { status: 400 });
    }

    // Verify token with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid ID token' }, { status: 401 });
    }

    let sessionCookie: string = '';
    try {
      sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_IN });
    } catch {
      // If createSessionCookie is unavailable in non-production or environment without full certs, fallback to verified idToken
      sessionCookie = idToken;
    }

    const response = NextResponse.json({ success: true, uid: decodedToken.uid });
    
    // Set secure HttpOnly cookie
    response.cookies.set('session', sessionCookie, {
      maxAge: Math.floor(SESSION_EXPIRES_IN / 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    // Also update auth-token with the verified session cookie (not raw UID)
    response.cookies.set('auth-token', sessionCookie, {
      maxAge: Math.floor(SESSION_EXPIRES_IN / 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('Session creation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create session' }, { status: 401 });
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true });
    
    // Clear cookies
    response.cookies.set('session', '', {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    response.cookies.set('auth-token', '', {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
