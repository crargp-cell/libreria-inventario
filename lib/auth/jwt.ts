import jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';

const DEV_FALLBACK_SECRET = 'dev-secret-change-in-production';

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret === DEV_FALLBACK_SECRET || secret.length < 32) {
      throw new Error('NEXTAUTH_SECRET must be set to a random value of at least 32 characters in production');
    }
    return secret;
  }
  return secret || DEV_FALLBACK_SECRET;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn: string | number = '24h'): string {
  return jwt.sign(payload, getSecret(), { expiresIn, algorithm: 'HS256' } as SignOptions);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}
