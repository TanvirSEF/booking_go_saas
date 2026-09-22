import { type NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { verifyPassword } from '@/lib/password';
import { signApiToken, apiSuccess, apiError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Mobile / Headless REST API Login Handler.
 * POST /api/v1/auth/login
 * Body: { email, password }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return apiError('Email and password are required.', 400);
    }

    await connectToDatabase();

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return apiError('Invalid login credentials.', 401);
    }

    if (user.isActive === false) {
      return apiError('Account suspended. Please contact platform support.', 403);
    }

    if (!user.password) {
      return apiError('Password login not available for this account.', 401);
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return apiError('Invalid login credentials.', 401);
    }

    // Resolve active business
    let activeBusinessId = user.activeBusinessId ? String(user.activeBusinessId) : '';
    if (!activeBusinessId) {
      const defaultBusiness = await Business.findOne({ companyId: user._id }).lean();
      if (defaultBusiness) {
        activeBusinessId = String(defaultBusiness._id);
        user.activeBusinessId = defaultBusiness._id;
        await user.save();
      }
    }

    const token = signApiToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
      activeBusinessId,
    });

    return apiSuccess({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      active_business: activeBusinessId,
      token,
      token_type: 'Bearer',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed.';
    return apiError(message, 500);
  }
}
