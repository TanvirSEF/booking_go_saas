'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { ContactUs, type ContactInquiryStatus } from '@/models/ContactUs';
import { Business } from '@/models/Business';
import { User } from '@/models/User';
import type {
  ContactInquiryDTO,
  SubmitContactInquiryInput,
  UpdateInquiryStatusInput,
  ContactInquiryFilterParams,
  PaginatedContactInquiriesResult,
  ContactInquiryActionResponse,
} from '@/types/contact-us';

const submitContactInquirySchema = z.object({
  businessSlug: z.string().min(1, 'Business slug is required').trim(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(120).trim(),
  email: z.string().email('Please enter a valid email address').max(150).trim().toLowerCase(),
  contact: z.string().min(3, 'Contact number is required').max(50).trim(),
  subject: z.string().min(2, 'Subject must be at least 2 characters').max(200).trim(),
  message: z.string().min(5, 'Message must be at least 5 characters').trim(),
  theme: z.string().trim().optional().default('default'),
});

const updateInquiryStatusSchema = z.object({
  id: z.string().min(1, 'Inquiry ID is required'),
  status: z.enum(['new', 'read', 'replied', 'archived'] as const),
  replyNotes: z.string().trim().optional(),
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
 * Public action: Submit a contact inquiry from booking wizard themes or public landing pages.
 */
export async function submitPublicContactInquiryAction(
  rawInput: SubmitContactInquiryInput
): Promise<ContactInquiryActionResponse<{ id: string }>> {
  try {
    await connectToDatabase();

    const input = submitContactInquirySchema.parse(rawInput);

    // Resolve target business storefront
    const business = await Business.findOne({
      slug: input.businessSlug,
      isActive: { $ne: false },
    }).lean();

    if (!business) {
      return { success: false, error: 'Target business could not be found or is inactive.' };
    }

    // Anti-spam flood throttle: check duplicate submission within past 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const existingRecent = await ContactUs.findOne({
      businessId: business._id,
      email: input.email,
      message: input.message,
      createdAt: { $gte: thirtySecondsAgo },
    }).lean();

    if (existingRecent) {
      return {
        success: false,
        error: 'You have recently sent an identical message. Please wait a moment before sending another.',
      };
    }

    const inquiry = await ContactUs.create({
      companyId: business.companyId,
      businessId: business._id,
      name: input.name,
      email: input.email,
      contact: input.contact,
      subject: input.subject,
      message: input.message,
      theme: input.theme || 'default',
      status: 'new',
    });

    return {
      success: true,
      message: 'Thank you! Your message has been sent successfully. We will get back to you shortly.',
      data: { id: String(inquiry._id) },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || 'Validation error.' };
    }
    const message = error instanceof Error ? error.message : 'Failed to submit contact inquiry.';
    return { success: false, error: message };
  }
}

/**
 * Tenant action: Query contact inquiries inbox for the active business with pagination,
 * status filtering, text search, and status counter breakdown.
 */
export async function getCompanyContactInquiriesAction(
  params: ContactInquiryFilterParams = {}
): Promise<ContactInquiryActionResponse<PaginatedContactInquiriesResult>> {
  try {
    const { businessId } = await resolveTenantContext();

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const bId = new Types.ObjectId(businessId);
    const query: Record<string, unknown> = { businessId: bId };

    if (params.status && params.status !== 'all') {
      query.status = params.status;
    }

    if (params.search && params.search.trim()) {
      const sanitized = params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(sanitized, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { subject: searchRegex },
        { contact: searchRegex },
      ];
    }

    // Execute paginated find, filtered total count, and status counters in parallel
    const [items, totalFiltered, countAggregation] = await Promise.all([
      ContactUs.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContactUs.countDocuments(query),
      ContactUs.aggregate([
        { $match: { businessId: bId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const counts = {
      total: 0,
      new: 0,
      read: 0,
      replied: 0,
      archived: 0,
    };

    countAggregation.forEach((entry: { _id: string; count: number }) => {
      counts.total += entry.count;
      if (entry._id === 'new') counts.new = entry.count;
      else if (entry._id === 'read') counts.read = entry.count;
      else if (entry._id === 'replied') counts.replied = entry.count;
      else if (entry._id === 'archived') counts.archived = entry.count;
    });

    const inquiries: ContactInquiryDTO[] = items.map((doc) => ({
      id: String(doc._id),
      name: doc.name,
      email: doc.email,
      contact: doc.contact,
      subject: doc.subject,
      message: doc.message,
      theme: doc.theme,
      status: doc.status,
      replyNotes: doc.replyNotes || '',
      repliedAt: doc.repliedAt ? doc.repliedAt.toISOString() : undefined,
      createdAt: doc.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        inquiries,
        pagination: {
          page,
          limit,
          total: totalFiltered,
          totalPages: Math.ceil(totalFiltered / limit) || 1,
        },
        counts,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve contact inquiries.';
    return { success: false, error: message };
  }
}

/**
 * Tenant action: View single inquiry detail. Automatically marks 'new' status as 'read'.
 */
export async function getContactInquiryByIdAction(
  id: string
): Promise<ContactInquiryActionResponse<ContactInquiryDTO>> {
  try {
    const { businessId } = await resolveTenantContext();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid inquiry ID format.' };
    }

    const inquiry = await ContactUs.findOne({
      _id: new Types.ObjectId(id),
      businessId: new Types.ObjectId(businessId),
    });

    if (!inquiry) {
      return { success: false, error: 'Contact inquiry not found.' };
    }

    // Auto-mark as read if newly opened
    if (inquiry.status === 'new') {
      inquiry.status = 'read';
      await inquiry.save();
    }

    const data: ContactInquiryDTO = {
      id: String(inquiry._id),
      name: inquiry.name,
      email: inquiry.email,
      contact: inquiry.contact,
      subject: inquiry.subject,
      message: inquiry.message,
      theme: inquiry.theme,
      status: inquiry.status,
      replyNotes: inquiry.replyNotes || '',
      repliedAt: inquiry.repliedAt ? inquiry.repliedAt.toISOString() : undefined,
      createdAt: inquiry.createdAt.toISOString(),
    };

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve inquiry detail.';
    return { success: false, error: message };
  }
}

/**
 * Tenant action: Update inquiry status (e.g. replied, archived) and optional internal staff notes.
 */
export async function updateContactInquiryStatusAction(
  rawInput: UpdateInquiryStatusInput
): Promise<ContactInquiryActionResponse<ContactInquiryDTO>> {
  try {
    const { businessId } = await resolveTenantContext();
    const input = updateInquiryStatusSchema.parse(rawInput);

    if (!Types.ObjectId.isValid(input.id)) {
      return { success: false, error: 'Invalid inquiry ID format.' };
    }

    const inquiry = await ContactUs.findOne({
      _id: new Types.ObjectId(input.id),
      businessId: new Types.ObjectId(businessId),
    });

    if (!inquiry) {
      return { success: false, error: 'Contact inquiry not found.' };
    }

    inquiry.status = input.status;
    if (input.replyNotes !== undefined) {
      inquiry.replyNotes = input.replyNotes;
    }
    if (input.status === 'replied' && !inquiry.repliedAt) {
      inquiry.repliedAt = new Date();
    }

    await inquiry.save();

    revalidatePath('/contacts');
    revalidatePath('/inbox');

    return {
      success: true,
      message: 'Inquiry status updated successfully.',
      data: {
        id: String(inquiry._id),
        name: inquiry.name,
        email: inquiry.email,
        contact: inquiry.contact,
        subject: inquiry.subject,
        message: inquiry.message,
        theme: inquiry.theme,
        status: inquiry.status,
        replyNotes: inquiry.replyNotes || '',
        repliedAt: inquiry.repliedAt ? inquiry.repliedAt.toISOString() : undefined,
        createdAt: inquiry.createdAt.toISOString(),
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || 'Validation error.' };
    }
    const message = error instanceof Error ? error.message : 'Failed to update inquiry status.';
    return { success: false, error: message };
  }
}

/**
 * Tenant action: Delete an individual contact inquiry.
 */
export async function deleteContactInquiryAction(
  id: string
): Promise<ContactInquiryActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid inquiry ID format.' };
    }

    const result = await ContactUs.deleteOne({
      _id: new Types.ObjectId(id),
      businessId: new Types.ObjectId(businessId),
    });

    if (result.deletedCount === 0) {
      return { success: false, error: 'Inquiry not found or already removed.' };
    }

    revalidatePath('/contacts');
    revalidatePath('/inbox');

    return {
      success: true,
      message: 'Inquiry deleted successfully.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete inquiry.';
    return { success: false, error: message };
  }
}

/**
 * Tenant action: Bulk update status for multiple inquiries.
 */
export async function bulkUpdateContactInquiriesAction(
  ids: string[],
  status: ContactInquiryStatus
): Promise<ContactInquiryActionResponse<{ updatedCount: number }>> {
  try {
    const { businessId } = await resolveTenantContext();

    const validIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (validIds.length === 0) {
      return { success: false, error: 'No valid inquiry IDs provided.' };
    }

    const updateDoc: Record<string, unknown> = { status };
    if (status === 'replied') {
      updateDoc.repliedAt = new Date();
    }

    const result = await ContactUs.updateMany(
      {
        _id: { $in: validIds },
        businessId: new Types.ObjectId(businessId),
      },
      { $set: updateDoc }
    );

    revalidatePath('/contacts');
    revalidatePath('/inbox');

    return {
      success: true,
      message: `Successfully updated ${result.modifiedCount} inquiries.`,
      data: { updatedCount: result.modifiedCount },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk update inquiries.';
    return { success: false, error: message };
  }
}

/**
 * Tenant action: Bulk delete multiple inquiries.
 */
export async function bulkDeleteContactInquiriesAction(
  ids: string[]
): Promise<ContactInquiryActionResponse<{ deletedCount: number }>> {
  try {
    const { businessId } = await resolveTenantContext();

    const validIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (validIds.length === 0) {
      return { success: false, error: 'No valid inquiry IDs provided.' };
    }

    const result = await ContactUs.deleteMany({
      _id: { $in: validIds },
      businessId: new Types.ObjectId(businessId),
    });

    revalidatePath('/contacts');
    revalidatePath('/inbox');

    return {
      success: true,
      message: `Successfully deleted ${result.deletedCount} inquiries.`,
      data: { deletedCount: result.deletedCount },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to bulk delete inquiries.';
    return { success: false, error: message };
  }
}
