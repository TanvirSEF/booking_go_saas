'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { recordLoginAuditAction } from '@/actions/login-detail';
import {
  toggleLoginAccessSchema,
  suspendUserSchema,
  reactivateUserSchema,
  type ToggleLoginAccessInput,
  type SuspendUserInput,
  type ReactivateUserInput,
  type UserAccountStatusDTO,
  type UserManagementActionResult,
} from '@/types/user-management';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op in test scripts or background tasks
  }
}

async function resolveAuthorizedAdmin(targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const callerRole = session.user.role;
  if (callerRole !== 'super admin' && callerRole !== 'company') {
    throw new Error('Forbidden: Only Super Admins and Company Owners can manage user access.');
  }

  await connectToDatabase();

  const callerId = session.user.id;
  if (callerId === targetUserId) {
    throw new Error('Forbidden: You cannot modify your own access or suspension status.');
  }

  const target = await User.findById(targetUserId);
  if (!target) {
    throw new Error('Target user not found.');
  }

  if (target.role === 'super admin') {
    throw new Error('Forbidden: Super Admin access cannot be disabled or suspended.');
  }

  // If caller is company owner, verify target belongs to their company
  if (callerRole === 'company') {
    const callerCompanyId = session.user.companyId || callerId;
    const targetCompanyId = target.companyId ? String(target.companyId) : null;

    if (!targetCompanyId || targetCompanyId !== callerCompanyId) {
      throw new Error('Forbidden: You can only manage users belonging to your company.');
    }
  }

  return { session, target };
}

/**
 * Toggles a user's login access (isEnableLogin).
 * Parity with Laravel WorkDo UserController@LoginManage ($user->is_enable_login).
 * If disabling login, increments tokenVersion to immediately revoke any active JWT sessions.
 */
export async function toggleUserLoginAccessAction(
  input: ToggleLoginAccessInput
): Promise<UserManagementActionResult> {
  try {
    const validation = toggleLoginAccessSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || 'Invalid input.' };
    }

    const { target, session } = await resolveAuthorizedAdmin(validation.data.userId);

    const currentStatus = target.isEnableLogin !== false;
    const newStatus = !currentStatus;

    target.isEnableLogin = newStatus;

    // Immediate session invalidation if disabling login
    if (!newStatus) {
      target.tokenVersion = (target.tokenVersion || 0) + 1;
    }

    await target.save();

    // Security audit log
    await recordLoginAuditAction({
      userId: String(target._id),
      role: target.role,
      companyId: target.companyId ? String(target.companyId) : undefined,
      businessId: target.activeBusinessId ? String(target.activeBusinessId) : undefined,
      ip: '127.0.0.1',
      userAgent: `[Audit] Login ${newStatus ? 'enabled' : 'disabled'} by ${session.user.name || session.user.email} (${session.user.role})`,
      status: 'success',
    }).catch(() => null);

    safeRevalidatePath('/dashboard/staff');
    safeRevalidatePath('/dashboard/customers');
    safeRevalidatePath('/super-admin/companies');

    return {
      success: true,
      isEnableLogin: target.isEnableLogin,
      message: `User login ${newStatus ? 'enabled' : 'disabled'} successfully.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to toggle login access.';
    return { success: false, error: message };
  }
}

/**
 * Suspends a user account.
 * Sets isActive: false, isEnableLogin: false, records reason and timestamp,
 * and atomically increments tokenVersion to immediately force logout across all active devices.
 */
export async function suspendUserAction(
  input: SuspendUserInput
): Promise<UserManagementActionResult> {
  try {
    const validation = suspendUserSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || 'Invalid input.' };
    }

    const { target, session } = await resolveAuthorizedAdmin(validation.data.userId);

    target.isActive = false;
    target.isEnableLogin = false;
    target.suspendedReason = validation.data.reason?.trim() || 'Account suspended by administrator.';
    target.suspendedAt = new Date();
    target.suspendedBy = new Types.ObjectId(session.user.id);
    target.tokenVersion = (target.tokenVersion || 0) + 1; // Instant revocation of all active JWTs

    await target.save();

    // Security audit log
    await recordLoginAuditAction({
      userId: String(target._id),
      role: target.role,
      companyId: target.companyId ? String(target.companyId) : undefined,
      businessId: target.activeBusinessId ? String(target.activeBusinessId) : undefined,
      ip: '127.0.0.1',
      userAgent: `[Audit] Suspension enacted by ${session.user.name || session.user.email} (${session.user.role})`,
      status: 'success',
    }).catch(() => null);

    safeRevalidatePath('/dashboard/staff');
    safeRevalidatePath('/dashboard/customers');
    safeRevalidatePath('/super-admin/companies');

    return {
      success: true,
      isActive: false,
      isEnableLogin: false,
      message: 'User account has been suspended and all active sessions revoked.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to suspend user account.';
    return { success: false, error: message };
  }
}

/**
 * Reactivates a suspended user account, restoring isActive: true and isEnableLogin: true.
 */
export async function reactivateUserAction(
  input: ReactivateUserInput
): Promise<UserManagementActionResult> {
  try {
    const validation = reactivateUserSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || 'Invalid input.' };
    }

    const { target, session } = await resolveAuthorizedAdmin(validation.data.userId);

    target.isActive = true;
    target.isEnableLogin = true;
    target.suspendedReason = undefined;
    target.suspendedAt = undefined;
    target.suspendedBy = undefined;

    await target.save();

    // Security audit log
    await recordLoginAuditAction({
      userId: String(target._id),
      role: target.role,
      companyId: target.companyId ? String(target.companyId) : undefined,
      businessId: target.activeBusinessId ? String(target.activeBusinessId) : undefined,
      ip: '127.0.0.1',
      userAgent: `[Audit] Reactivation enacted by ${session.user.name || session.user.email} (${session.user.role})`,
      status: 'success',
    }).catch(() => null);

    safeRevalidatePath('/dashboard/staff');
    safeRevalidatePath('/dashboard/customers');
    safeRevalidatePath('/super-admin/companies');

    return {
      success: true,
      isActive: true,
      isEnableLogin: true,
      message: 'User account reactivated successfully.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reactivate user account.';
    return { success: false, error: message };
  }
}

/**
 * Retrieves the full account status and suspension telemetry for an account.
 */
export async function getUserAccountStatusAction(
  userId: string
): Promise<{ success: boolean; data?: UserAccountStatusDTO; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    await connectToDatabase();

    const target = await User.findById(userId).lean();
    if (!target) {
      return { success: false, error: 'User not found.' };
    }

    const callerRole = session.user.role;
    const isSelf = session.user.id === String(target._id);

    if (callerRole !== 'super admin' && !isSelf) {
      const callerCompanyId = session.user.companyId || session.user.id;
      const targetCompanyId = target.companyId ? String(target.companyId) : null;
      if (!targetCompanyId || targetCompanyId !== callerCompanyId) {
        return { success: false, error: 'Forbidden: Insufficient permissions.' };
      }
    }

    return {
      success: true,
      data: {
        userId: String(target._id),
        name: target.name,
        email: target.email,
        role: target.role,
        isActive: target.isActive !== false,
        isEnableLogin: target.isEnableLogin !== false,
        tokenVersion: target.tokenVersion || 0,
        suspendedReason: target.suspendedReason || null,
        suspendedAt: target.suspendedAt ? target.suspendedAt.toISOString() : null,
        companyId: target.companyId ? String(target.companyId) : null,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user status.';
    return { success: false, error: message };
  }
}
