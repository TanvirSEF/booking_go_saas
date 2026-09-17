'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Testimonial } from '@/models/Testimonial';
import { Business } from '@/models/Business';
import { User } from '@/models/User';
import type {
  TestimonialDTO,
  CreateTestimonialInput,
  UpdateTestimonialInput,
  ReorderTestimonialsInput,
  TestimonialActionResponse,
} from '@/types/testimonial';

const createTestimonialSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  title: z.string().trim().optional().default(''),
  rating: z.number().int().min(1, 'Rating must be at least 1 star').max(5, 'Rating cannot exceed 5 stars'),
  description: z.string().min(5, 'Review description must be at least 5 characters').trim(),
  image: z.string().optional().default(''),
  isActive: z.boolean().optional().default(true),
});

const updateTestimonialSchema = z.object({
  id: z.string().min(1, 'Testimonial ID is required'),
  name: z.string().min(2, 'Name must be at least 2 characters').trim().optional(),
  title: z.string().trim().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  description: z.string().min(5).trim().optional(),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
});

async function resolveTenantContext() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized. Please log in.');
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id).lean();
  if (!user) {
    throw new Error('User account not found.');
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
  if (!activeBusinessId) {
    const defaultBusiness = await Business.findOne({ companyId }).lean();
    if (defaultBusiness) {
      activeBusinessId = defaultBusiness._id;
      await User.findByIdAndUpdate(user._id, { activeBusinessId: defaultBusiness._id });
    }
  }

  if (!activeBusinessId) {
    throw new Error('No active business found for this organization.');
  }

  return {
    userId: user._id,
    companyId,
    businessId: activeBusinessId,
  };
}

/**
 * Public query for booking wizard themes to fetch active reviews by business slug.
 */
export async function getPublicTestimonialsAction(
  businessSlug: string
): Promise<TestimonialActionResponse<TestimonialDTO[]>> {
  try {
    await connectToDatabase();

    const business = await Business.findOne({ slug: businessSlug, isActive: { $ne: false } }).lean();
    if (!business) {
      return { success: false, error: 'Business not found.' };
    }

    const reviews = await Testimonial.find({
      businessId: business._id,
      isActive: true,
    })
      .sort({ order: 1, createdAt: -1 })
      .limit(10)
      .lean();

    const data: TestimonialDTO[] = reviews.map((r) => ({
      id: String(r._id),
      name: r.name,
      title: r.title || '',
      rating: r.rating ?? 5,
      description: r.description,
      image: r.image || '',
      isActive: r.isActive,
      order: r.order ?? 0,
      createdAt: r.createdAt.toISOString(),
    }));

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve public testimonials.';
    return { success: false, error: message };
  }
}

/**
 * Retrieves all company testimonials for the active business.
 */
export async function getCompanyTestimonialsAction(): Promise<
  TestimonialActionResponse<TestimonialDTO[]>
> {
  try {
    const { businessId } = await resolveTenantContext();

    const reviews = await Testimonial.find({
      businessId: new Types.ObjectId(businessId),
    })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    const data: TestimonialDTO[] = reviews.map((r) => ({
      id: String(r._id),
      name: r.name,
      title: r.title || '',
      rating: r.rating ?? 5,
      description: r.description,
      image: r.image || '',
      isActive: r.isActive,
      order: r.order ?? 0,
      createdAt: r.createdAt.toISOString(),
    }));

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve company testimonials.';
    return { success: false, error: message };
  }
}

/**
 * Creates a new testimonial review for the tenant.
 */
export async function createTestimonialAction(
  rawInput: CreateTestimonialInput
): Promise<TestimonialActionResponse<TestimonialDTO>> {
  try {
    const { companyId, businessId } = await resolveTenantContext();
    const input = createTestimonialSchema.parse(rawInput);

    const lastItem = await Testimonial.findOne({
      businessId: new Types.ObjectId(businessId),
    })
      .sort({ order: -1 })
      .select('order')
      .lean();

    const nextOrder = (lastItem?.order ?? -1) + 1;

    const testimonial = await Testimonial.create({
      companyId,
      businessId,
      name: input.name,
      title: input.title,
      rating: input.rating,
      description: input.description,
      image: input.image,
      isActive: input.isActive ?? true,
      order: nextOrder,
    });

    revalidatePath('/testimonials');
    revalidatePath('/appointments');

    return {
      success: true,
      message: 'Testimonial created successfully.',
      data: {
        id: String(testimonial._id),
        name: testimonial.name,
        title: testimonial.title || '',
        rating: testimonial.rating,
        description: testimonial.description,
        image: testimonial.image || '',
        isActive: testimonial.isActive,
        order: testimonial.order,
        createdAt: testimonial.createdAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create testimonial.';
    return { success: false, error: message };
  }
}

/**
 * Updates an existing testimonial.
 */
export async function updateTestimonialAction(
  rawInput: UpdateTestimonialInput
): Promise<TestimonialActionResponse<TestimonialDTO>> {
  try {
    const { businessId } = await resolveTenantContext();
    const input = updateTestimonialSchema.parse(rawInput);

    if (!Types.ObjectId.isValid(input.id)) {
      return { success: false, error: 'Invalid testimonial ID format.' };
    }

    const testimonial = await Testimonial.findOne({
      _id: new Types.ObjectId(input.id),
      businessId: new Types.ObjectId(businessId),
    });

    if (!testimonial) {
      return { success: false, error: 'Testimonial not found.' };
    }

    if (input.name !== undefined) testimonial.name = input.name;
    if (input.title !== undefined) testimonial.title = input.title;
    if (input.rating !== undefined) testimonial.rating = input.rating;
    if (input.description !== undefined) testimonial.description = input.description;
    if (input.image !== undefined) testimonial.image = input.image;
    if (input.isActive !== undefined) testimonial.isActive = input.isActive;

    await testimonial.save();

    revalidatePath('/testimonials');
    revalidatePath('/appointments');

    return {
      success: true,
      message: 'Testimonial updated successfully.',
      data: {
        id: String(testimonial._id),
        name: testimonial.name,
        title: testimonial.title || '',
        rating: testimonial.rating,
        description: testimonial.description,
        image: testimonial.image || '',
        isActive: testimonial.isActive,
        order: testimonial.order,
        createdAt: testimonial.createdAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update testimonial.';
    return { success: false, error: message };
  }
}

/**
 * Toggles a testimonial's published status.
 */
export async function toggleTestimonialStatusAction(
  id: string
): Promise<TestimonialActionResponse<{ isActive: boolean }>> {
  try {
    const { businessId } = await resolveTenantContext();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid testimonial ID format.' };
    }

    const testimonial = await Testimonial.findOne({
      _id: new Types.ObjectId(id),
      businessId: new Types.ObjectId(businessId),
    });

    if (!testimonial) {
      return { success: false, error: 'Testimonial not found.' };
    }

    testimonial.isActive = !testimonial.isActive;
    await testimonial.save();

    revalidatePath('/testimonials');
    revalidatePath('/appointments');

    return {
      success: true,
      message: `Testimonial is now ${testimonial.isActive ? 'published' : 'hidden'}.`,
      data: { isActive: testimonial.isActive },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to toggle status.';
    return { success: false, error: message };
  }
}

/**
 * Deletes a testimonial.
 */
export async function deleteTestimonialAction(
  id: string
): Promise<TestimonialActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid testimonial ID format.' };
    }

    const result = await Testimonial.deleteOne({
      _id: new Types.ObjectId(id),
      businessId: new Types.ObjectId(businessId),
    });

    if (result.deletedCount === 0) {
      return { success: false, error: 'Testimonial not found or already removed.' };
    }

    revalidatePath('/testimonials');
    revalidatePath('/appointments');

    return {
      success: true,
      message: 'Testimonial deleted successfully.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete testimonial.';
    return { success: false, error: message };
  }
}

/**
 * Reorders testimonials.
 */
export async function reorderTestimonialsAction(
  input: ReorderTestimonialsInput
): Promise<TestimonialActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();

    if (!Array.isArray(input.orderedIds) || input.orderedIds.length === 0) {
      return { success: false, error: 'orderedIds must be a non-empty array.' };
    }

    const bulkOps = input.orderedIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id, index) => ({
        updateOne: {
          filter: {
            _id: new Types.ObjectId(id),
            businessId: new Types.ObjectId(businessId),
          },
          update: { $set: { order: index } },
        },
      }));

    if (bulkOps.length > 0) {
      await Testimonial.bulkWrite(bulkOps);
    }

    revalidatePath('/testimonials');
    revalidatePath('/appointments');

    return {
      success: true,
      message: 'Testimonials reordered successfully.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reorder testimonials.';
    return { success: false, error: message };
  }
}
