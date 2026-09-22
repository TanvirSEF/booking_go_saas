'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Category } from '@/models/Category';
import { Service } from '@/models/Service';
import { Business } from '@/models/Business';
import { User } from '@/models/User';
import { checkPlanLimit } from '@/lib/plan-limits';

export interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  serviceCount: number;
  createdAt: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  image?: string;
  price: number;
  durationMinutes: number;
  description?: string;
  isFree: boolean;
  onlineMeetingType?: 'none' | 'zoom' | 'google_meet';
  onlineMeetingUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  planLimitExceeded?: boolean;
}

const categoryInputSchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').trim(),
  description: z.string().optional().default(''),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

const serviceInputSchema = z.object({
  name: z.string().min(2, 'Service name must be at least 2 characters').trim(),
  categoryId: z.string().min(1, 'Category is required'),
  image: z.string().optional().default(''),
  durationMinutes: z.coerce.number().min(5, 'Duration must be at least 5 minutes'),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  isFree: z.boolean().default(false),
  description: z.string().optional().default(''),
  onlineMeetingType: z.enum(['none', 'zoom', 'google_meet']).optional().default('none'),
  onlineMeetingUrl: z.string().optional().default(''),
  isActive: z.boolean().default(true),
});

export type ServiceInput = z.infer<typeof serviceInputSchema>;

/**
 * Resolves authenticated tenant context (companyId, activeBusinessId, activeBusinessSlug).
 */
async function resolveTenantContext() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized. Please log in.');
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id).lean();
  if (!user) {
    throw new Error('User not found.');
  }

  const companyId =
    user.role === 'company'
      ? user._id
      : user.companyId
        ? new Types.ObjectId(user.companyId)
        : null;

  if (!companyId) {
    throw new Error('Company context could not be determined.');
  }

  let activeBusinessId = user.activeBusinessId;
  let activeBusinessSlug = '';

  if (!activeBusinessId) {
    const defaultBusiness = await Business.findOne({ companyId }).lean();
    if (defaultBusiness) {
      activeBusinessId = defaultBusiness._id;
      activeBusinessSlug = defaultBusiness.slug;
      await User.findByIdAndUpdate(user._id, { activeBusinessId: defaultBusiness._id });
    }
  } else {
    const businessDoc = await Business.findById(activeBusinessId).select('slug').lean();
    if (businessDoc) {
      activeBusinessSlug = businessDoc.slug;
    }
  }

  if (!activeBusinessId) {
    throw new Error('No active business found for this organization.');
  }

  return {
    userId: user._id,
    companyId,
    businessId: activeBusinessId,
    businessSlug: activeBusinessSlug,
  };
}

/**
 * Retrieves all categories for the active tenant with service count badges.
 */
export async function getCategories(): Promise<ServiceActionResult<CategoryItem[]>> {
  try {
    const { companyId, businessId } = await resolveTenantContext();

    const [categoriesDocs, serviceCounts] = await Promise.all([
      Category.find({ companyId, businessId }).sort({ name: 1 }).lean(),
      Service.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { companyId, businessId } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map<string, number>();
    for (const item of serviceCounts) {
      countMap.set(String(item._id), item.count);
    }

    const data: CategoryItem[] = categoriesDocs.map((cat) => ({
      id: String(cat._id),
      name: cat.name,
      description: cat.description || '',
      serviceCount: countMap.get(String(cat._id)) || 0,
      createdAt: cat.createdAt ? cat.createdAt.toISOString() : new Date().toISOString(),
    }));

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve categories.';
    return { success: false, error: message };
  }
}

/**
 * Creates a new category scoped to the active tenant.
 */
export async function createCategory(
  rawInput: CategoryInput
): Promise<ServiceActionResult<CategoryItem>> {
  try {
    const { companyId, businessId } = await resolveTenantContext();

    const parsed = categoryInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid category data.';
      return { success: false, error: firstError };
    }

    const { name, description } = parsed.data;

    const existing = await Category.findOne({
      companyId,
      businessId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    }).lean();

    if (existing) {
      return { success: false, error: `Category "${name}" already exists.` };
    }

    const newCategory = await Category.create({
      companyId,
      businessId,
      name,
      description,
    });

    revalidatePath('/dashboard/services');
    revalidatePath('/dashboard/services/catalog');
    revalidatePath('/dashboard/services/categories');
    revalidatePath('/services');

    return {
      success: true,
      data: {
        id: String(newCategory._id),
        name: newCategory.name,
        description: newCategory.description || '',
        serviceCount: 0,
        createdAt: newCategory.createdAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create category.';
    return { success: false, error: message };
  }
}

/**
 * Deletes a category if it has no associated services.
 */
export async function deleteCategory(id: string): Promise<ServiceActionResult<{ id: string }>> {
  try {
    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid category ID format.' };
    }

    const { companyId, businessId } = await resolveTenantContext();
    const categoryObjectId = new Types.ObjectId(id);

    const linkedServicesCount = await Service.countDocuments({
      companyId,
      businessId,
      categoryId: categoryObjectId,
    });

    if (linkedServicesCount > 0) {
      return {
        success: false,
        error: `Cannot delete category: ${linkedServicesCount} service(s) are assigned to it. Please reassign or delete those services first.`,
      };
    }

    const deleted = await Category.findOneAndDelete({
      _id: categoryObjectId,
      companyId,
      businessId,
    });

    if (!deleted) {
      return { success: false, error: 'Category not found or permission denied.' };
    }

    revalidatePath('/dashboard/services');
    revalidatePath('/dashboard/services/catalog');
    revalidatePath('/dashboard/services/categories');
    revalidatePath('/services');

    return { success: true, data: { id } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete category.';
    return { success: false, error: message };
  }
}

/**
 * Retrieves all services for the active tenant, optionally filtered by category.
 */
export async function getServices(
  categoryId?: string
): Promise<ServiceActionResult<ServiceItem[]>> {
  try {
    const { companyId, businessId } = await resolveTenantContext();

    const query: Record<string, unknown> = { companyId, businessId };
    if (categoryId && Types.ObjectId.isValid(categoryId)) {
      query.categoryId = new Types.ObjectId(categoryId);
    }

    const [servicesDocs, categoriesDocs] = await Promise.all([
      Service.find(query).sort({ createdAt: -1 }).lean(),
      Category.find({ companyId, businessId }).select('name').lean(),
    ]);

    const categoryMap = new Map<string, string>();
    for (const cat of categoriesDocs) {
      categoryMap.set(String(cat._id), cat.name);
    }

    const data: ServiceItem[] = servicesDocs.map((srv) => ({
      id: String(srv._id),
      name: srv.name,
      categoryId: String(srv.categoryId),
      categoryName: categoryMap.get(String(srv.categoryId)) || 'Uncategorized',
      image: srv.image || '',
      price: srv.price || 0,
      durationMinutes: srv.durationMinutes || 30,
      description: srv.description || '',
      isFree: Boolean(srv.isFree),
      onlineMeetingType: srv.onlineMeetingType,
      onlineMeetingUrl: srv.onlineMeetingUrl,
      isActive: Boolean(srv.isActive),
      createdAt: srv.createdAt ? srv.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: srv.updatedAt ? srv.updatedAt.toISOString() : new Date().toISOString(),
    }));

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve services.';
    return { success: false, error: message };
  }
}

/**
 * Creates a new service with plan quota enforcement.
 */
export async function createService(
  rawInput: ServiceInput
): Promise<ServiceActionResult<ServiceItem>> {
  try {
    const { companyId, businessId, businessSlug } = await resolveTenantContext();

    // 1. Enforce Subscription Plan Limit
    const planCheck = await checkPlanLimit(companyId, 'services');
    if (!planCheck.allowed) {
      return {
        success: false,
        error: planCheck.message || 'Your plan limit for services has been reached. Please upgrade your plan.',
        planLimitExceeded: true,
      };
    }

    // 2. Validate input schema
    const parsed = serviceInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid service data.';
      return { success: false, error: firstError };
    }

    const {
      name,
      categoryId,
      image,
      durationMinutes,
      price,
      isFree,
      description,
      onlineMeetingType,
      onlineMeetingUrl,
      isActive,
    } = parsed.data;

    if (!Types.ObjectId.isValid(categoryId)) {
      return { success: false, error: 'Invalid category selected.' };
    }

    // 3. Verify category belongs to tenant
    const categoryDoc = await Category.findOne({
      _id: new Types.ObjectId(categoryId),
      companyId,
      businessId,
    }).lean();

    if (!categoryDoc) {
      return { success: false, error: 'Selected category does not exist.' };
    }

    // 4. Create service document
    const newService = await Service.create({
      companyId,
      businessId,
      categoryId: new Types.ObjectId(categoryId),
      name,
      image: image || '',
      price: isFree ? 0 : price,
      durationMinutes,
      description,
      isFree,
      onlineMeetingType,
      onlineMeetingUrl,
      isActive,
    });

    revalidatePath('/dashboard/services');
    revalidatePath('/dashboard/services/catalog');
    revalidatePath('/dashboard/services/categories');
    revalidatePath('/services');
    if (businessSlug) {
      revalidatePath(`/appointments/${businessSlug}`);
    }

    return {
      success: true,
      data: {
        id: String(newService._id),
        name: newService.name,
        categoryId: String(newService.categoryId),
        categoryName: categoryDoc.name,
        image: newService.image || '',
        price: newService.price,
        durationMinutes: newService.durationMinutes,
        description: newService.description || '',
        isFree: newService.isFree,
        onlineMeetingType: newService.onlineMeetingType,
        onlineMeetingUrl: newService.onlineMeetingUrl,
        isActive: newService.isActive,
        createdAt: newService.createdAt.toISOString(),
        updatedAt: newService.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create service.';
    return { success: false, error: message };
  }
}

/**
 * Updates an existing service with tenant ownership verification.
 */
export async function updateService(
  id: string,
  rawInput: ServiceInput
): Promise<ServiceActionResult<ServiceItem>> {
  try {
    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid service ID format.' };
    }

    const { companyId, businessId, businessSlug } = await resolveTenantContext();

    const serviceDoc = await Service.findOne({
      _id: new Types.ObjectId(id),
      companyId,
      businessId,
    });

    if (!serviceDoc) {
      return { success: false, error: 'Service not found or permission denied.' };
    }

    const parsed = serviceInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid service data.';
      return { success: false, error: firstError };
    }

    const {
      name,
      categoryId,
      image,
      durationMinutes,
      price,
      isFree,
      description,
      onlineMeetingType,
      onlineMeetingUrl,
      isActive,
    } = parsed.data;

    if (!Types.ObjectId.isValid(categoryId)) {
      return { success: false, error: 'Invalid category selected.' };
    }

    const categoryDoc = await Category.findOne({
      _id: new Types.ObjectId(categoryId),
      companyId,
      businessId,
    }).lean();

    if (!categoryDoc) {
      return { success: false, error: 'Selected category does not exist.' };
    }

    serviceDoc.name = name;
    serviceDoc.categoryId = new Types.ObjectId(categoryId);
    if (image !== undefined) serviceDoc.image = image;
    serviceDoc.durationMinutes = durationMinutes;
    serviceDoc.price = isFree ? 0 : price;
    serviceDoc.isFree = isFree;
    serviceDoc.description = description;
    serviceDoc.onlineMeetingType = onlineMeetingType;
    serviceDoc.onlineMeetingUrl = onlineMeetingUrl;
    serviceDoc.isActive = isActive;

    await serviceDoc.save();

    revalidatePath('/dashboard/services');
    revalidatePath('/dashboard/services/catalog');
    revalidatePath('/dashboard/services/categories');
    revalidatePath('/services');
    if (businessSlug) {
      revalidatePath(`/appointments/${businessSlug}`);
    }

    return {
      success: true,
      data: {
        id: String(serviceDoc._id),
        name: serviceDoc.name,
        categoryId: String(serviceDoc.categoryId),
        categoryName: categoryDoc.name,
        price: serviceDoc.price,
        durationMinutes: serviceDoc.durationMinutes,
        description: serviceDoc.description || '',
        isFree: serviceDoc.isFree,
        onlineMeetingType: serviceDoc.onlineMeetingType,
        onlineMeetingUrl: serviceDoc.onlineMeetingUrl,
        isActive: serviceDoc.isActive,
        createdAt: serviceDoc.createdAt.toISOString(),
        updatedAt: serviceDoc.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update service.';
    return { success: false, error: message };
  }
}

/**
 * Toggles active status of a service for booking availability.
 */
export async function toggleServiceStatus(
  id: string
): Promise<ServiceActionResult<{ id: string; isActive: boolean }>> {
  try {
    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid service ID format.' };
    }

    const { companyId, businessId, businessSlug } = await resolveTenantContext();

    const serviceDoc = await Service.findOne({
      _id: new Types.ObjectId(id),
      companyId,
      businessId,
    });

    if (!serviceDoc) {
      return { success: false, error: 'Service not found or permission denied.' };
    }

    serviceDoc.isActive = !serviceDoc.isActive;
    await serviceDoc.save();

    revalidatePath('/dashboard/services');
    revalidatePath('/dashboard/services/catalog');
    revalidatePath('/dashboard/services/categories');
    revalidatePath('/services');
    if (businessSlug) {
      revalidatePath(`/appointments/${businessSlug}`);
    }

    return {
      success: true,
      data: {
        id: String(serviceDoc._id),
        isActive: serviceDoc.isActive,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to toggle service status.';
    return { success: false, error: message };
  }
}

/**
 * Deletes a service with tenant ownership verification.
 */
export async function deleteService(
  id: string
): Promise<ServiceActionResult<{ id: string }>> {
  try {
    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid service ID format.' };
    }

    const { companyId, businessId, businessSlug } = await resolveTenantContext();

    const result = await Service.findOneAndDelete({
      _id: new Types.ObjectId(id),
      companyId,
      businessId,
    });

    if (!result) {
      return { success: false, error: 'Service not found or permission denied.' };
    }

    revalidatePath('/dashboard/services');
    revalidatePath('/dashboard/services/catalog');
    revalidatePath('/dashboard/services/categories');
    revalidatePath('/services');
    if (businessSlug) {
      revalidatePath(`/appointments/${businessSlug}`);
    }

    return { success: true, data: { id } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete service.';
    return { success: false, error: message };
  }
}
