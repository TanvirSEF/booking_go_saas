'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { CustomField } from '@/models/CustomField';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import type {
  CustomFieldDTO,
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
  ReorderCustomFieldsInput,
  CustomFieldActionResponse,
} from '@/types/custom-field';

const customFieldTypeEnum = z.enum([
  'text',
  'number',
  'email',
  'date',
  'select',
  'textarea',
  'radio',
  'checkbox',
]);

const createCustomFieldSchema = z.object({
  label: z.string().min(1, 'Field label is required').trim(),
  type: customFieldTypeEnum,
  options: z.array(z.string().trim()).optional().default([]),
  placeholder: z.string().optional().default(''),
  defaultValue: z.string().optional().default(''),
  isRequired: z.boolean().optional().default(false),
});

const updateCustomFieldSchema = z.object({
  id: z.string().min(1, 'Field ID is required'),
  label: z.string().min(1, 'Field label is required').trim().optional(),
  type: customFieldTypeEnum.optional(),
  options: z.array(z.string().trim()).optional(),
  placeholder: z.string().optional(),
  defaultValue: z.string().optional(),
  isRequired: z.boolean().optional(),
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
 * Retrieves all custom fields configured for the active business.
 */
export async function getCustomFieldsAction(): Promise<
  CustomFieldActionResponse<CustomFieldDTO[]>
> {
  try {
    const { businessId } = await resolveTenantContext();

    const fields = await CustomField.find({
      businessId: new Types.ObjectId(businessId),
    })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const data: CustomFieldDTO[] = fields.map((f) => ({
      id: String(f._id),
      label: f.label,
      type: f.type,
      options: f.options || [],
      placeholder: f.placeholder || '',
      defaultValue: f.defaultValue || '',
      isRequired: Boolean(f.isRequired),
      order: f.order ?? 0,
      createdAt: f.createdAt.toISOString(),
    }));

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch custom fields.';
    return { success: false, error: message };
  }
}

/**
 * Creates a new custom field for appointment booking.
 */
export async function createCustomFieldAction(
  rawInput: CreateCustomFieldInput
): Promise<CustomFieldActionResponse<CustomFieldDTO>> {
  try {
    const { companyId, businessId } = await resolveTenantContext();
    const input = createCustomFieldSchema.parse(rawInput);

    // Calculate next order position
    const lastField = await CustomField.findOne({
      businessId: new Types.ObjectId(businessId),
    })
      .sort({ order: -1 })
      .select('order')
      .lean();

    const nextOrder = (lastField?.order ?? -1) + 1;

    // Filter empty options for select/radio/checkbox
    const cleanOptions = ['select', 'radio', 'checkbox'].includes(input.type)
      ? input.options.filter((opt) => opt.trim().length > 0)
      : [];

    const field = await CustomField.create({
      companyId,
      businessId,
      label: input.label,
      type: input.type,
      options: cleanOptions,
      placeholder: input.placeholder,
      defaultValue: input.defaultValue,
      isRequired: input.isRequired,
      order: nextOrder,
    });

    revalidatePath('/custom-fields');
    revalidatePath('/appointments');

    return {
      success: true,
      message: 'Custom field created successfully.',
      data: {
        id: String(field._id),
        label: field.label,
        type: field.type,
        options: field.options,
        placeholder: field.placeholder || '',
        defaultValue: field.defaultValue || '',
        isRequired: field.isRequired,
        order: field.order,
        createdAt: field.createdAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create custom field.';
    return { success: false, error: message };
  }
}

/**
 * Updates an existing custom field definition.
 */
export async function updateCustomFieldAction(
  rawInput: UpdateCustomFieldInput
): Promise<CustomFieldActionResponse<CustomFieldDTO>> {
  try {
    const { businessId } = await resolveTenantContext();
    const input = updateCustomFieldSchema.parse(rawInput);

    if (!Types.ObjectId.isValid(input.id)) {
      return { success: false, error: 'Invalid field ID format.' };
    }

    const field = await CustomField.findOne({
      _id: new Types.ObjectId(input.id),
      businessId: new Types.ObjectId(businessId),
    });

    if (!field) {
      return { success: false, error: 'Custom field not found.' };
    }

    if (input.label !== undefined) field.label = input.label;
    if (input.type !== undefined) field.type = input.type;
    if (input.placeholder !== undefined) field.placeholder = input.placeholder;
    if (input.defaultValue !== undefined) field.defaultValue = input.defaultValue;
    if (input.isRequired !== undefined) field.isRequired = input.isRequired;

    if (input.options !== undefined) {
      field.options = input.options.filter((opt) => opt.trim().length > 0);
    }

    await field.save();

    revalidatePath('/custom-fields');
    revalidatePath('/appointments');

    return {
      success: true,
      message: 'Custom field updated successfully.',
      data: {
        id: String(field._id),
        label: field.label,
        type: field.type,
        options: field.options,
        placeholder: field.placeholder || '',
        defaultValue: field.defaultValue || '',
        isRequired: field.isRequired,
        order: field.order,
        createdAt: field.createdAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update custom field.';
    return { success: false, error: message };
  }
}

/**
 * Deletes a custom field.
 */
export async function deleteCustomFieldAction(
  fieldId: string
): Promise<CustomFieldActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();

    if (!Types.ObjectId.isValid(fieldId)) {
      return { success: false, error: 'Invalid field ID format.' };
    }

    const result = await CustomField.deleteOne({
      _id: new Types.ObjectId(fieldId),
      businessId: new Types.ObjectId(businessId),
    });

    if (result.deletedCount === 0) {
      return { success: false, error: 'Custom field not found or already removed.' };
    }

    revalidatePath('/custom-fields');
    revalidatePath('/appointments');

    return {
      success: true,
      message: 'Custom field deleted successfully.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete custom field.';
    return { success: false, error: message };
  }
}

/**
 * Reorders custom fields based on user drag-and-drop hierarchy.
 */
export async function reorderCustomFieldsAction(
  input: ReorderCustomFieldsInput
): Promise<CustomFieldActionResponse> {
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
      await CustomField.bulkWrite(bulkOps);
    }

    revalidatePath('/custom-fields');
    revalidatePath('/appointments');

    return {
      success: true,
      message: 'Custom fields reordered successfully.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reorder custom fields.';
    return { success: false, error: message };
  }
}
