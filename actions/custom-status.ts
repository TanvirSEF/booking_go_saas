'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { CustomStatus } from '@/models/CustomStatus';
import { Appointment } from '@/models/Appointment';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import type {
  CustomStatusDTO,
  CreateCustomStatusInput,
  UpdateCustomStatusInput,
  ReorderCustomStatusInput,
  CustomStatusActionResponse,
} from '@/types/custom-status';

const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const createCustomStatusSchema = z.object({
  title: z.string().min(1, 'Status title is required').trim(),
  statusColor: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color code')
    .optional()
    .default('#21c9b0'),
  icon: z.string().optional().default('ti-loader'),
});

const updateCustomStatusSchema = z.object({
  id: z.string().min(1, 'Status ID is required'),
  title: z.string().min(1, 'Status title is required').trim().optional(),
  statusColor: z
    .string()
    .regex(hexColorRegex, 'Invalid hex color code')
    .optional(),
  icon: z.string().optional(),
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
 * Retrieves all custom statuses for the active business.
 */
export async function getCustomStatusesAction(): Promise<
  CustomStatusActionResponse<CustomStatusDTO[]>
> {
  try {
    const { businessId } = await resolveTenantContext();

    const statuses = await CustomStatus.find({
      businessId: new Types.ObjectId(businessId),
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const data: CustomStatusDTO[] = statuses.map((s) => ({
      id: String(s._id),
      title: s.title,
      statusColor: s.statusColor,
      icon: s.icon,
      order: s.order ?? 0,
      createdAt: s.createdAt.toISOString(),
    }));

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch custom statuses.';
    return { success: false, error: message };
  }
}

/**
 * Creates a new custom status for the appointment pipeline.
 */
export async function createCustomStatusAction(
  rawInput: CreateCustomStatusInput
): Promise<CustomStatusActionResponse<CustomStatusDTO>> {
  try {
    const { companyId, businessId } = await resolveTenantContext();
    const input = createCustomStatusSchema.parse(rawInput);

    // Prevent duplicate status titles under the same business
    const existing = await CustomStatus.findOne({
      businessId: new Types.ObjectId(businessId),
      title: { $regex: new RegExp(`^${input.title.trim()}$`, 'i') },
    }).lean();

    if (existing) {
      return { success: false, error: 'A custom status with this title already exists.' };
    }

    const lastStatus = await CustomStatus.findOne({
      businessId: new Types.ObjectId(businessId),
    })
      .sort({ order: -1 })
      .select('order')
      .lean();

    const nextOrder = (lastStatus?.order ?? -1) + 1;

    const newStatus = await CustomStatus.create({
      companyId,
      businessId,
      title: input.title,
      statusColor: input.statusColor,
      icon: input.icon,
      order: nextOrder,
    });

    revalidatePath('/custom-status');
    revalidatePath('/appointments');

    return {
      success: true,
      message: 'Custom status created successfully.',
      data: {
        id: String(newStatus._id),
        title: newStatus.title,
        statusColor: newStatus.statusColor,
        icon: newStatus.icon,
        order: newStatus.order,
        createdAt: newStatus.createdAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create custom status.';
    return { success: false, error: message };
  }
}

/**
 * Updates an existing custom status.
 */
export async function updateCustomStatusAction(
  rawInput: UpdateCustomStatusInput
): Promise<CustomStatusActionResponse<CustomStatusDTO>> {
  try {
    const { businessId } = await resolveTenantContext();
    const input = updateCustomStatusSchema.parse(rawInput);

    if (!Types.ObjectId.isValid(input.id)) {
      return { success: false, error: 'Invalid custom status ID.' };
    }

    const statusDoc = await CustomStatus.findOne({
      _id: new Types.ObjectId(input.id),
      businessId: new Types.ObjectId(businessId),
    });

    if (!statusDoc) {
      return { success: false, error: 'Custom status not found.' };
    }

    if (input.title && input.title !== statusDoc.title) {
      const duplicate = await CustomStatus.findOne({
        businessId: new Types.ObjectId(businessId),
        title: { $regex: new RegExp(`^${input.title.trim()}$`, 'i') },
        _id: { $ne: statusDoc._id },
      }).lean();

      if (duplicate) {
        return { success: false, error: 'Another status with this title already exists.' };
      }

      // Update color on existing appointments matching this status
      await Appointment.updateMany(
        {
          businessId: new Types.ObjectId(businessId),
          appointmentStatus: statusDoc.title,
        },
        {
          $set: {
            appointmentStatus: input.title,
            ...(input.statusColor ? { statusColor: input.statusColor } : {}),
          },
        }
      );

      statusDoc.title = input.title;
    }

    if (input.statusColor) {
      statusDoc.statusColor = input.statusColor;
      await Appointment.updateMany(
        {
          businessId: new Types.ObjectId(businessId),
          appointmentStatus: statusDoc.title,
        },
        { $set: { statusColor: input.statusColor } }
      );
    }

    if (input.icon) statusDoc.icon = input.icon;

    await statusDoc.save();

    revalidatePath('/custom-status');
    revalidatePath('/appointments');

    return {
      success: true,
      message: 'Custom status updated successfully.',
      data: {
        id: String(statusDoc._id),
        title: statusDoc.title,
        statusColor: statusDoc.statusColor,
        icon: statusDoc.icon,
        order: statusDoc.order,
        createdAt: statusDoc.createdAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update custom status.';
    return { success: false, error: message };
  }
}

/**
 * Deletes a custom status with appointment safety guard.
 */
export async function deleteCustomStatusAction(
  statusId: string
): Promise<CustomStatusActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();

    if (!Types.ObjectId.isValid(statusId)) {
      return { success: false, error: 'Invalid custom status ID.' };
    }

    const statusDoc = await CustomStatus.findOne({
      _id: new Types.ObjectId(statusId),
      businessId: new Types.ObjectId(businessId),
    });

    if (!statusDoc) {
      return { success: false, error: 'Custom status not found.' };
    }

    // Check if any appointments are actively assigned this custom status
    const assignedCount = await Appointment.countDocuments({
      businessId: new Types.ObjectId(businessId),
      appointmentStatus: statusDoc.title,
    });

    if (assignedCount > 0) {
      return {
        success: false,
        error: `Cannot delete status "${statusDoc.title}". It is currently assigned to ${assignedCount} appointment(s). Please reassign them first.`,
      };
    }

    await CustomStatus.deleteOne({ _id: statusDoc._id });

    revalidatePath('/custom-status');
    revalidatePath('/appointments');

    return {
      success: true,
      message: `Status "${statusDoc.title}" deleted successfully.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete custom status.';
    return { success: false, error: message };
  }
}

/**
 * Reorders custom statuses.
 */
export async function reorderCustomStatusesAction(
  input: ReorderCustomStatusInput
): Promise<CustomStatusActionResponse> {
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
      await CustomStatus.bulkWrite(bulkOps);
    }

    revalidatePath('/custom-status');
    revalidatePath('/appointments');

    return {
      success: true,
      message: 'Custom statuses reordered successfully.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reorder custom statuses.';
    return { success: false, error: message };
  }
}
