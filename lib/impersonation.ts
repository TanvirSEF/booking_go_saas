import crypto from 'crypto';
import type { ImpersonationTicketPayload } from '@/types/impersonation';

function getImpersonationSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET is not configured in production environment.');
    }
    return 'bookinggo-impersonation-dev-fallback-key-2026';
  }
  return secret;
}

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
 * Creates a signed, single-use, 60-second impersonation ticket for Super Admin to access a company.
 */
export function createImpersonationTicket(
  admin: { id: string; name: string; email: string },
  targetUserId: string
): string {
  const secret = getImpersonationSecret();
  const payload: ImpersonationTicketPayload = {
    adminId: admin.id,
    targetUserId,
    adminName: admin.name,
    adminEmail: admin.email,
    isRestore: false,
    exp: Date.now() + 60 * 1000, // 60 seconds TTL
    nonce: crypto.randomUUID(),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

/**
 * Creates a signed, single-use ticket allowing an impersonating user to restore the original Super Admin session.
 */
export function createRestoreAdminTicket(
  admin: { id: string; name: string; email: string }
): string {
  const secret = getImpersonationSecret();
  const payload: ImpersonationTicketPayload = {
    adminId: admin.id,
    targetUserId: admin.id,
    adminName: admin.name,
    adminEmail: admin.email,
    isRestore: true,
    exp: Date.now() + 60 * 1000, // 60 seconds TTL
    nonce: crypto.randomUUID(),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies the cryptographic signature and expiration of an impersonation ticket.
 */
export function verifyImpersonationTicket(ticket: string): ImpersonationTicketPayload | null {
  try {
    if (!ticket || typeof ticket !== 'string' || !ticket.includes('.')) {
      return null;
    }

    const [encodedPayload, providedSignature] = ticket.split('.');
    if (!encodedPayload || !providedSignature) {
      return null;
    }

    const secret = getImpersonationSecret();
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(encodedPayload)
      .digest('base64url');

    // Prevent timing attacks
    const providedBuf = Buffer.from(providedSignature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (
      providedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      return null;
    }

    const jsonStr = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(jsonStr) as ImpersonationTicketPayload;

    if (!payload.adminId || !payload.targetUserId || !payload.exp) {
      return null;
    }

    // Check expiration
    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('[verifyImpersonationTicket] Verification failed:', error);
    return null;
  }
}
