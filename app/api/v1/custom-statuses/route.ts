import { type NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { authenticateApiRequest, apiSuccess, apiError } from '@/lib/api-auth';
import { CustomStatus } from '@/models/CustomStatus';

export const dynamic = 'force-dynamic';

/**
 * Mobile / Headless REST API Custom Status Management Handler.
 * GET /api/v1/custom-statuses
 * POST /api/v1/custom-statuses
 * PUT /api/v1/custom-statuses
 * DELETE /api/v1/custom-statuses
 */

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await authenticateApiRequest(req);
    if (!businessId) {
      return apiError('Active business not established.', 400);
    }

    const statuses = await CustomStatus.find({ businessId: new Types.ObjectId(businessId) })
      .sort({ order: 1 })
      .lean();

    const statusData = statuses.map((s) => ({
      id: String(s._id),
      title: s.title,
      status_color: s.statusColor || '#21c9b0',
      icon: s.icon || 'ti-loader',
    }));

    return apiSuccess(statusData);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve custom statuses.';
    return apiError(message, 401);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, businessId } = await authenticateApiRequest(req);
    if (!businessId) {
      return apiError('Active business not established.', 400);
    }

    const body = await req.json().catch(() => ({}));
    const { title, status_color, icon } = body;

    if (!title) {
      return apiError('Title is required.', 400);
    }

    const companyId = user.role === 'company' ? user._id : user.companyId || user._id;

    const newStatus = await CustomStatus.create({
      companyId,
      businessId: new Types.ObjectId(businessId),
      title: title.trim(),
      statusColor: status_color || '#21c9b0',
      icon: icon || 'ti-check',
      order: 0,
    });

    return apiSuccess({
      id: String(newStatus._id),
      message: 'Custom Status successfully created.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create custom status.';
    return apiError(message, 400);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { businessId } = await authenticateApiRequest(req);
    const body = await req.json().catch(() => ({}));
    const { id, title, status_color, icon } = body;

    if (!id) {
      return apiError('Custom status id is required.', 400);
    }

    const statusDoc = await CustomStatus.findOne({ _id: id, businessId });
    if (!statusDoc) {
      return apiError('Custom status not found.', 404);
    }

    if (title) statusDoc.title = title.trim();
    if (status_color) statusDoc.statusColor = status_color;
    if (icon) statusDoc.icon = icon;

    await statusDoc.save();

    return apiSuccess({ message: 'Custom Status updated successfully.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update custom status.';
    return apiError(message, 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { businessId } = await authenticateApiRequest(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('Custom status id query param is required.', 400);
    }

    const statusDoc = await CustomStatus.findOne({ _id: id, businessId });
    if (!statusDoc) {
      return apiError('Custom status not found.', 404);
    }

    await statusDoc.deleteOne();

    return apiSuccess({ message: 'Custom Status successfully deleted.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete custom status.';
    return apiError(message, 400);
  }
}
