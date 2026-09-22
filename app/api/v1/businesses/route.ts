import { type NextRequest } from 'next/server';
import { authenticateApiRequest, apiSuccess, apiError } from '@/lib/api-auth';
import { Business } from '@/models/Business';

export const dynamic = 'force-dynamic';

/**
 * Mobile / Headless REST API Business Management Handler.
 * GET /api/v1/businesses
 * PATCH /api/v1/businesses
 * DELETE /api/v1/businesses
 */

export async function GET(req: NextRequest) {
  try {
    const { user } = await authenticateApiRequest(req);
    const companyId = user.role === 'company' ? user._id : user.companyId || user._id;

    const businesses = await Business.find({ companyId }).sort({ createdAt: -1 }).lean();
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const businessList = businesses.map((b) => ({
      id: String(b._id),
      name: b.name,
      slug: b.slug,
      url: `${baseUrl}/appointments/${b.slug}`,
    }));

    return apiSuccess(businessList);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve businesses.';
    return apiError(message, 401);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, businessId } = await authenticateApiRequest(req);
    const body = await req.json().catch(() => ({}));
    const { name, slug } = body;

    if (!name) {
      return apiError('Business name is required.', 400);
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return apiError('Business not found.', 404);
    }

    const companyId = user.role === 'company' ? user._id : user.companyId || user._id;
    if (String(business.companyId) !== String(companyId)) {
      return apiError('Forbidden. Ownership mismatch.', 403);
    }

    business.name = name.trim();
    if (slug) {
      const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');
      const conflict = await Business.findOne({ slug: cleanSlug, _id: { $ne: business._id } });
      if (conflict) {
        return apiError('Slug is already in use by another business.', 400);
      }
      business.slug = cleanSlug;
    }

    await business.save();

    return apiSuccess({ message: 'Business updated successfully.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update business.';
    return apiError(message, 401);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, businessId } = await authenticateApiRequest(req);
    const companyId = user.role === 'company' ? user._id : user.companyId || user._id;

    const business = await Business.findById(businessId);
    if (!business) {
      return apiError('Business not found.', 404);
    }

    if (String(business.companyId) !== String(companyId)) {
      return apiError('Forbidden. Ownership mismatch.', 403);
    }

    // Find another business under same company to switch to
    const fallbackBusiness = await Business.findOne({
      companyId,
      _id: { $ne: business._id },
    }).lean();

    if (!fallbackBusiness) {
      return apiError('Cannot delete the only remaining business.', 400);
    }

    user.activeBusinessId = fallbackBusiness._id;
    await user.save();
    await business.deleteOne();

    return apiSuccess({
      business_id: String(fallbackBusiness._id),
      message: 'Business deleted successfully.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete business.';
    return apiError(message, 401);
  }
}
