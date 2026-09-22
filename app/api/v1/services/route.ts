import { type NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { authenticateApiRequest, apiSuccess, apiError } from '@/lib/api-auth';
import { Service } from '@/models/Service';
import { Category } from '@/models/Category';
import { formatBusinessPrice } from '@/lib/currency-engine';

export const dynamic = 'force-dynamic';

/**
 * Mobile / Headless REST API Service Management Handler.
 * GET /api/v1/services
 * POST /api/v1/services
 * PUT /api/v1/services
 * DELETE /api/v1/services
 */

export async function GET(req: NextRequest) {
  try {
    const { businessId } = await authenticateApiRequest(req);
    if (!businessId) {
      return apiError('Active business not established.', 400);
    }

    const businessObjId = new Types.ObjectId(businessId);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const skip = (page - 1) * limit;

    // Load categories
    const categories = await Category.find({ businessId: businessObjId }).lean();
    const category_list = categories.map((c) => ({
      id: String(c._id),
      name: c.name,
    }));

    const [total, services] = await Promise.all([
      Service.countDocuments({ businessId: businessObjId }),
      Service.find({ businessId: businessObjId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('categoryId', 'name')
        .lean(),
    ]);

    interface PopulatedServiceDoc {
      _id: unknown;
      name: string;
      categoryId?: { name?: string };
      image?: string;
      price?: number;
      durationMinutes?: number;
      description?: string;
    }

    const service_list = await Promise.all(
      (services as unknown as PopulatedServiceDoc[]).map(async (s) => ({
        id: String(s._id),
        name: s.name,
        category: s.categoryId?.name || 'General',
        image: s.image || '',
        price: await formatBusinessPrice(s.price || 0, businessObjId),
        raw_price: s.price || 0,
        duration: s.durationMinutes || 30,
        description: s.description || '',
      }))
    );

    const totalPages = Math.ceil(total / limit) || 1;

    return apiSuccess({
      category_list,
      service_list,
      total,
      per_page: limit,
      current_page: page,
      last_page: totalPages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve services.';
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
    const { name, category, price, duration, description, image } = body;

    if (!name || !category) {
      return apiError('Service name and category are required.', 400);
    }

    const businessObjId = new Types.ObjectId(businessId);
    const companyId = user.role === 'company' ? user._id : user.companyId || user._id;

    // Verify or resolve category
    let categoryId: Types.ObjectId;
    if (Types.ObjectId.isValid(category)) {
      categoryId = new Types.ObjectId(category);
    } else {
      let foundCat = await Category.findOne({
        businessId: businessObjId,
        name: { $regex: new RegExp(`^${category.trim()}$`, 'i') },
      });
      if (!foundCat) {
        foundCat = await Category.create({
          companyId,
          businessId: businessObjId,
          name: category.trim(),
        });
      }
      categoryId = foundCat._id;
    }

    const service = await Service.create({
      companyId,
      businessId: businessObjId,
      categoryId,
      name: name.trim(),
      price: typeof price === 'number' ? price : parseFloat(price) || 0,
      durationMinutes: typeof duration === 'number' ? duration : parseInt(duration, 10) || 30,
      description: description || '',
      image: image || '',
      isActive: true,
    });

    return apiSuccess({
      id: String(service._id),
      message: 'Service successfully created.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create service.';
    return apiError(message, 400);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { businessId } = await authenticateApiRequest(req);
    const body = await req.json().catch(() => ({}));
    const { id, name, category, price, duration, description, image } = body;

    if (!id) {
      return apiError('Service id is required.', 400);
    }

    const service = await Service.findOne({ _id: id, businessId });
    if (!service) {
      return apiError('Service not found.', 404);
    }

    if (name) service.name = name.trim();
    if (price !== undefined) service.price = typeof price === 'number' ? price : parseFloat(price) || 0;
    if (duration !== undefined) {
      service.durationMinutes = typeof duration === 'number' ? duration : parseInt(duration, 10) || 30;
    }
    if (description !== undefined) service.description = description;
    if (image !== undefined) service.image = image;

    if (category) {
      if (Types.ObjectId.isValid(category)) {
        service.categoryId = new Types.ObjectId(category);
      }
    }

    await service.save();

    return apiSuccess({ message: 'Service updated successfully.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update service.';
    return apiError(message, 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { businessId } = await authenticateApiRequest(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('Service id query param is required.', 400);
    }

    const service = await Service.findOne({ _id: id, businessId });
    if (!service) {
      return apiError('Service not found.', 404);
    }

    await service.deleteOne();

    return apiSuccess({ message: 'Service successfully deleted.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete service.';
    return apiError(message, 400);
  }
}
