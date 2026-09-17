'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { LoginDetail } from '@/models/LoginDetail';
import { User, type UserRole } from '@/models/User';
import { parseUserAgent } from '@/lib/user-agent';
import type {
  LoginDetailDTO,
  LoginDetailFilterParams,
  PaginatedLoginDetailsResult,
  RecordLoginInput,
  DeviceTypeBreakdown,
  LoginDetailActionResponse,
} from '@/types/login-detail';

/**
 * Internal/Server action to record a login security audit log.
 * Runs non-blockingly to guarantee login flow is never degraded.
 */
export async function recordLoginAuditAction(
  input: RecordLoginInput
): Promise<LoginDetailActionResponse<{ id: string }>> {
  try {
    if (!Types.ObjectId.isValid(input.userId)) {
      return { success: false, error: 'Invalid user ID format.' };
    }

    await connectToDatabase();

    const { browser, os, deviceType } = parseUserAgent(input.userAgent || '');

    const logData: Record<string, unknown> = {
      userId: new Types.ObjectId(input.userId),
      role: input.role as UserRole,
      ip: input.ip || '127.0.0.1',
      userAgent: input.userAgent || '',
      browser,
      os,
      deviceType,
      status: input.status || 'success',
      loginAt: new Date(),
    };

    if (input.companyId && Types.ObjectId.isValid(input.companyId)) {
      logData.companyId = new Types.ObjectId(input.companyId);
    }
    if (input.businessId && Types.ObjectId.isValid(input.businessId)) {
      logData.businessId = new Types.ObjectId(input.businessId);
    }

    const log = await LoginDetail.create(logData);

    return {
      success: true,
      message: 'Login audit recorded.',
      data: { id: String(log._id) },
    };
  } catch (error) {
    console.error('[recordLoginAuditAction] Audit recording failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to record login audit.';
    return { success: false, error: message };
  }
}

/**
 * Query login security history with hierarchical role scoping, date ranges, and device statistics.
 */
export async function getLoginHistoryAction(
  params: LoginDetailFilterParams = {}
): Promise<LoginDetailActionResponse<PaginatedLoginDetailsResult>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized. Please log in.');
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id).lean();
    if (!user) {
      throw new Error('User account not found.');
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    // 1. Enforce Role Scoping
    if (user.role === 'super admin') {
      if (params.userId && Types.ObjectId.isValid(params.userId)) {
        query.userId = new Types.ObjectId(params.userId);
      }
      if (params.role && params.role !== 'all') {
        query.role = params.role;
      }
    } else if (user.role === 'company') {
      query.$or = [
        { companyId: user._id },
        { userId: user._id },
      ];
      if (params.userId && Types.ObjectId.isValid(params.userId)) {
        query.userId = new Types.ObjectId(params.userId);
      }
    } else {
      // Staff or Customer can only view their own login activity
      query.userId = user._id;
    }

    // 2. Date Filtering
    if (params.startDate || params.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (params.startDate) {
        dateFilter.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        dateFilter.$lte = new Date(params.endDate);
      }
      query.loginAt = dateFilter;
    }

    // 3. Search Filter (by IP or search term)
    if (params.search && params.search.trim()) {
      const sanitized = params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(sanitized, 'i');

      const matchingUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      })
        .select('_id')
        .limit(20)
        .lean();

      const userIds = matchingUsers.map((u) => u._id);

      query.$or = [
        { ip: searchRegex },
        { browser: searchRegex },
        { os: searchRegex },
        ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
      ];
    }

    const [items, totalFiltered, deviceAggregation] = await Promise.all([
      LoginDetail.find(query)
        .sort({ loginAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate<{ userId: { _id: Types.ObjectId; name: string; email: string } }>(
          'userId',
          'name email'
        )
        .lean(),
      LoginDetail.countDocuments(query),
      LoginDetail.aggregate([
        { $match: query },
        { $group: { _id: '$deviceType', count: { $sum: 1 } } },
      ]),
    ]);

    const deviceBreakdown: DeviceTypeBreakdown = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
      other: 0,
    };

    deviceAggregation.forEach((entry: { _id: string; count: number }) => {
      if (entry._id === 'desktop') deviceBreakdown.desktop = entry.count;
      else if (entry._id === 'mobile') deviceBreakdown.mobile = entry.count;
      else if (entry._id === 'tablet') deviceBreakdown.tablet = entry.count;
      else deviceBreakdown.other += entry.count;
    });

    const logs: LoginDetailDTO[] = items.map((doc) => {
      const u = doc.userId as { _id?: Types.ObjectId; name?: string; email?: string } | null;
      return {
        id: String(doc._id),
        userId: u?._id ? String(u._id) : String(doc.userId),
        userName: u?.name,
        userEmail: u?.email,
        role: doc.role,
        ip: doc.ip,
        browser: doc.browser,
        os: doc.os,
        deviceType: doc.deviceType,
        country: doc.country || '',
        city: doc.city || '',
        status: doc.status,
        loginAt: doc.loginAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total: totalFiltered,
          totalPages: Math.ceil(totalFiltered / limit) || 1,
        },
        deviceBreakdown,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve login history.';
    return { success: false, error: message };
  }
}

/**
 * Retrieves the latest login sessions for the currently authenticated user.
 */
export async function getRecentLoginLogsAction(
  limit: number = 5
): Promise<LoginDetailActionResponse<LoginDetailDTO[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized. Please log in.');
    }

    await connectToDatabase();

    const items = await LoginDetail.find({
      userId: new Types.ObjectId(session.user.id),
    })
      .sort({ loginAt: -1 })
      .limit(Math.min(20, Math.max(1, limit)))
      .lean();

    const data: LoginDetailDTO[] = items.map((doc) => ({
      id: String(doc._id),
      userId: String(doc.userId),
      role: doc.role,
      ip: doc.ip,
      browser: doc.browser,
      os: doc.os,
      deviceType: doc.deviceType,
      country: doc.country || '',
      city: doc.city || '',
      status: doc.status,
      loginAt: doc.loginAt.toISOString(),
    }));

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve recent logins.';
    return { success: false, error: message };
  }
}

/**
 * Deletes a specific login audit log with permission checks.
 */
export async function deleteLoginLogAction(
  id: string
): Promise<LoginDetailActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized. Please log in.');
    }

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: 'Invalid login log ID format.' };
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id).lean();
    if (!user) {
      throw new Error('User account not found.');
    }

    const query: Record<string, unknown> = { _id: new Types.ObjectId(id) };

    if (user.role === 'company') {
      query.companyId = user._id;
    } else if (user.role !== 'super admin') {
      return { success: false, error: 'Permission denied to delete audit logs.' };
    }

    const result = await LoginDetail.deleteOne(query);

    if (result.deletedCount === 0) {
      return { success: false, error: 'Log not found or already deleted.' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/super-admin');

    return {
      success: true,
      message: 'Login log successfully deleted.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete login log.';
    return { success: false, error: message };
  }
}

/**
 * Prunes login logs older than specified retention days (GDPR & database maintenance).
 */
export async function clearOldLoginLogsAction(
  retentionDays: number = 90
): Promise<LoginDetailActionResponse<{ deletedCount: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'super admin') {
      throw new Error('Unauthorized: Super Admin access required.');
    }

    await connectToDatabase();

    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await LoginDetail.deleteMany({
      loginAt: { $lt: cutoffDate },
    });

    revalidatePath('/super-admin');

    return {
      success: true,
      message: `Successfully pruned ${result.deletedCount} audit logs older than ${retentionDays} days.`,
      data: { deletedCount: result.deletedCount },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to prune old login logs.';
    return { success: false, error: message };
  }
}
