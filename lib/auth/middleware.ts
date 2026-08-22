import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './jwt';

export interface AuthRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export function withAuth(handler: (req: AuthRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const authReq = req as AuthRequest;
    authReq.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    return handler(authReq);
  };
}

export function withRoles(...allowedRoles: string[]) {
  return (handler: (req: AuthRequest) => Promise<NextResponse>) => {
    return withAuth(async (req: AuthRequest) => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return handler(req);
    });
  };
}
