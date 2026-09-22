import { type NextRequest } from 'next/server';
import { authenticateApiRequest, apiSuccess, apiError } from '@/lib/api-auth';
import { Business } from '@/models/Business';

export const dynamic = 'force-dynamic';

/**
 * Mobile / Headless REST API Switch Active Business Handler.
 * POST /api/v1/businesses/active
 * Body: { business_id }
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await authenticateApiRequest(req);
    const body = await req.json().catch(() => ({}));
    const { business_id } = body;

    if (!business_id) {
      return apiError('business_id is required.', 400);
    }

    const business = await Business.findById(business_id);
    if (!business) {
      return apiError('Business not found.', 404);
    }

    const companyId = user.role === 'company' ? user._id : user.companyId || user._id;
    if (String(business.companyId) !== String(companyId)) {
      return apiError('Forbidden. You do not own this business.', 403);
    }

    user.activeBusinessId = business._id;
    await user.save();

    return apiSuccess({
      active_business: String(business._id),
      message: 'Active business switched successfully.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to switch business.';
    return apiError(message, 401);
  }
}
