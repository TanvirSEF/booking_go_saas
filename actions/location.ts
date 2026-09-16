'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Location } from '@/models/Location';
import { Business } from '@/models/Business';
import { User } from '@/models/User';
import { checkPlanLimit } from '@/lib/plan-limits';

export interface LocationItem {
  id: string;
  name: string;
  address: string;
  phone: string;
  description: string;
  image?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocationActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  planLimitExceeded?: boolean;
}

const locationInputSchema = z.object({
  name: z.string().min(2, 'Location name must be at least 2 characters').trim(),
  address: z.string().min(3, 'Address must be at least 3 characters').trim(),
  phone: z.string().optional().default(''),
  description: z.string().optional().default(''),
  image: z.string().optional().default(''),
  isActive: z.boolean().default(true),
});

export type LocationInput = z.infer<typeof locationInputSchema>;

/**
 * Helper to resolve authenticated tenant context (companyId and activeBusinessId).
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
 * Retrieves all locations for the active company & business.
 */
export async function getLocations(): Promise<LocationActionResult<LocationItem[]>> {
  try {
    const { companyId, businessId } = await resolveTenantContext();

    const locationsDocs = await Location.find({
      companyId,
      businessId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const data: LocationItem[] = locationsDocs.map((loc) => ({
      id: String(loc._id),
      name: loc.name,
      address: loc.address || '',
      phone: loc.phone || '',
      description: loc.description || '',
      image: loc.image,
      isActive: loc.isActive,
      createdAt: loc.createdAt ? loc.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: loc.updatedAt ? loc.updatedAt.toISOString() : new Date().toISOString(),
    }));

    return { success: true, data };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to retrieve locations.';
    return { success: false, error: errMessage };
  }
}

/**
 * Creates a new location with plan quota enforcement.
 */
export async function createLocation(
  rawInput: LocationInput
): Promise<LocationActionResult<LocationItem>> {
  try {
    const { companyId, businessId } = await resolveTenantContext();

    // 1. Enforce Subscription Plan Quota
    const planCheck = await checkPlanLimit(companyId, 'locations');
    if (!planCheck.allowed) {
      return {
        success: false,
        error: planCheck.message || 'Your plan limit for locations has been reached. Please upgrade.',
        planLimitExceeded: true,
      };
    }

    // 2. Validate input schema
    const parsed = locationInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input data.';
      return { success: false, error: firstError };
    }

    const { name, address, phone, description, image, isActive } = parsed.data;

    // 3. Create location document
    const newLocation = await Location.create({
      companyId,
      businessId,
      name,
      address,
      phone,
      description,
      image,
      isActive,
    });

    revalidatePath('/dashboard/locations');
    revalidatePath('/locations');

    return {
      success: true,
      data: {
        id: String(newLocation._id),
        name: newLocation.name,
        address: newLocation.address || '',
        phone: newLocation.phone || '',
        description: newLocation.description || '',
        image: newLocation.image,
        isActive: newLocation.isActive,
        createdAt: newLocation.createdAt.toISOString(),
        updatedAt: newLocation.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to create location.';
    return { success: false, error: errMessage };
  }
}

/**
 * Updates an existing location with tenant ownership verification.
 */
export async function updateLocation(
  id: string,
  rawInput: LocationInput
): Promise<LocationActionResult<LocationItem>> {
  try {
    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid location ID format.' };
    }

    const { companyId, businessId } = await resolveTenantContext();

    // 1. Verify existence and ownership
    const locationDoc = await Location.findOne({
      _id: new Types.ObjectId(id),
      companyId,
      businessId,
    });

    if (!locationDoc) {
      return { success: false, error: 'Location not found or permission denied.' };
    }

    // 2. Validate input schema
    const parsed = locationInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input data.';
      return { success: false, error: firstError };
    }

    const { name, address, phone, description, image, isActive } = parsed.data;

    locationDoc.name = name;
    locationDoc.address = address;
    locationDoc.phone = phone;
    locationDoc.description = description;
    locationDoc.image = image;
    locationDoc.isActive = isActive;

    await locationDoc.save();

    revalidatePath('/dashboard/locations');
    revalidatePath('/locations');

    return {
      success: true,
      data: {
        id: String(locationDoc._id),
        name: locationDoc.name,
        address: locationDoc.address || '',
        phone: locationDoc.phone || '',
        description: locationDoc.description || '',
        image: locationDoc.image,
        isActive: locationDoc.isActive,
        createdAt: locationDoc.createdAt.toISOString(),
        updatedAt: locationDoc.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to update location.';
    return { success: false, error: errMessage };
  }
}

/**
 * Toggles the active status of a location.
 */
export async function toggleLocationStatus(
  id: string
): Promise<LocationActionResult<{ id: string; isActive: boolean }>> {
  try {
    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid location ID format.' };
    }

    const { companyId, businessId } = await resolveTenantContext();

    const locationDoc = await Location.findOne({
      _id: new Types.ObjectId(id),
      companyId,
      businessId,
    });

    if (!locationDoc) {
      return { success: false, error: 'Location not found or permission denied.' };
    }

    locationDoc.isActive = !locationDoc.isActive;
    await locationDoc.save();

    revalidatePath('/dashboard/locations');
    revalidatePath('/locations');

    return {
      success: true,
      data: {
        id: String(locationDoc._id),
        isActive: locationDoc.isActive,
      },
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to toggle location status.';
    return { success: false, error: errMessage };
  }
}

/**
 * Deletes a location with tenant ownership verification.
 */
export async function deleteLocation(
  id: string
): Promise<LocationActionResult<{ id: string }>> {
  try {
    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid location ID format.' };
    }

    const { companyId, businessId } = await resolveTenantContext();

    const result = await Location.findOneAndDelete({
      _id: new Types.ObjectId(id),
      companyId,
      businessId,
    });

    if (!result) {
      return { success: false, error: 'Location not found or permission denied.' };
    }

    revalidatePath('/dashboard/locations');
    revalidatePath('/locations');

    return {
      success: true,
      data: { id },
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Failed to delete location.';
    return { success: false, error: errMessage };
  }
}
