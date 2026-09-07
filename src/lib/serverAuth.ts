import { adminAuth, adminDb, FieldValue } from './firebaseAdmin';
import { NextResponse } from 'next/server';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  role: string;
  employeeData: any;
}

export async function verifyAuthUser(req: Request): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = req.headers.get('authorization');
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1].trim();
    }

    // Also check cookies
    if (!token) {
      const cookieHeader = req.headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map((c) => {
          const [k, ...v] = c.trim().split('=');
          return [k, v.join('=')];
        })
      );
      token = cookies['session'] || cookies['auth-token'] || null;
    }

    if (!token) return null;

    let decodedToken: any = null;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      try {
        decodedToken = await adminAuth.verifySessionCookie(token, true);
      } catch {
        // Fallback for custom signed tokens / dev environments if needed
        return null;
      }
    }

    if (!decodedToken || !decodedToken.uid) return null;

    const uid = decodedToken.uid;
    const email = decodedToken.email || '';

    // Fetch employee data from Firestore
    const empSnap = await adminDb.collection('employees').doc(uid).get();
    const employeeData = empSnap.exists ? empSnap.data() : {};
    const role = employeeData?.role || 'employee';

    return {
      uid,
      email,
      role,
      employeeData,
    };
  } catch (error) {
    console.error('Error verifying auth user:', error);
    return null;
  }
}

export async function requireAuth(
  req: Request,
  allowedRoles?: string[]
): Promise<{ user: AuthenticatedUser | null; response?: NextResponse }> {
  const user = await verifyAuthUser(req);

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Unauthorized: Valid authentication credentials required.' },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const isAllowed = allowedRoles.includes(user.role);
    if (!isAllowed) {
      return {
        user: null,
        response: NextResponse.json(
          { error: 'Forbidden: Insufficient privileges to perform this action.' },
          { status: 403 }
        ),
      };
    }
  }

  return { user };
}

export async function logAuditRecord(params: {
  actorId: string;
  action: string;
  targetCollection: string;
  description: string;
  metadata?: Record<string, any>;
}) {
  try {
    await adminDb.collection('auditLog').add({
      actorId: params.actorId,
      action: params.action,
      targetCollection: params.targetCollection,
      description: params.description,
      metadata: params.metadata || {},
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
