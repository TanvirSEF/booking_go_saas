import crypto from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User, type IUserDocument } from '@/models/User';
import type { ApiJwtPayload } from '@/types/api-v1';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.API_SECRET || 'booking_go_api_jwt_secret_key_2026';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Signs a tamper-proof JWT token with 30-day expiration for mobile / headless REST API clients.
 */
export function signApiToken(payload: Omit<ApiJwtPayload, 'iat' | 'exp'>, expiresInDays = 30): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInDays * 86400;

  const fullPayload: ApiJwtPayload = {
    ...payload,
    iat,
    exp,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifies JWT token signature and expiration, returning decoded payload or throwing error.
 */
export function decodeAndVerifyToken(token: string): ApiJwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Bearer token.');
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature.');
  }

  const payloadStr = base64UrlDecode(encodedPayload);
  const payload = JSON.parse(payloadStr) as ApiJwtPayload;

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token has expired. Please log in again.');
  }

  return payload;
}

/**
 * Middleware authentication guard for Next.js Route Handlers.
 * Extracts `Authorization: Bearer <token>`, verifies user status in database, and returns authenticated user doc.
 */
export async function authenticateApiRequest(req: NextRequest | Request): Promise<{
  payload: ApiJwtPayload;
  user: IUserDocument;
  businessId: string;
}> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header. Expected Bearer token.');
  }

  const token = authHeader.substring(7).trim();
  const payload = decodeAndVerifyToken(token);

  await connectToDatabase();
  const user = await User.findById(payload.userId);
  if (!user) {
    throw new Error('Authenticated user account no longer exists.');
  }

  if (user.isActive === false) {
    throw new Error('Account suspended. Please contact platform support.');
  }

  const businessId = String(payload.activeBusinessId || user.activeBusinessId || '');

  return {
    payload,
    user,
    businessId,
  };
}

/**
 * Standardized success response matching Laravel WorkDo ApiResponser format.
 */
export function apiSuccess<T>(data: T, message?: string, status = 200) {
  return NextResponse.json(
    {
      status: 'success',
      data,
      ...(message ? { message } : {}),
    },
    { status }
  );
}

/**
 * Standardized error response matching Laravel WorkDo ApiResponser format.
 */
export function apiError(message: string, status = 400) {
  return NextResponse.json(
    {
      status: 'error',
      message,
    },
    { status }
  );
}
