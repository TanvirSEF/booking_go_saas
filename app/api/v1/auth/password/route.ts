import { type NextRequest } from 'next/server';
import { authenticateApiRequest, apiSuccess, apiError } from '@/lib/api-auth';
import { verifyPassword, hashPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';

/**
 * Mobile / Headless REST API Password Update Handler.
 * POST /api/v1/auth/password
 * Header: Authorization: Bearer <token>
 * Body: { current_password, new_password }
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await authenticateApiRequest(req);
    const body = await req.json().catch(() => ({}));
    const { current_password, new_password } = body;

    if (!current_password || !new_password) {
      return apiError('Current password and new password are required.', 400);
    }

    if (new_password.length < 4) {
      return apiError('New password must be at least 4 characters.', 400);
    }

    if (!user.password) {
      return apiError('Password cannot be changed for this account.', 400);
    }

    const isMatch = await verifyPassword(current_password, user.password);
    if (!isMatch) {
      return apiError('Incorrect current password.', 400);
    }

    user.password = await hashPassword(new_password);
    await user.save();

    return apiSuccess({ message: 'User Password updated successfully.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password update failed.';
    return apiError(message, 401);
  }
}
