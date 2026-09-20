'use server';

import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { recordLoginAuditAction } from '@/actions/login-detail';
import {
  createImpersonationTicket,
  createRestoreAdminTicket,
} from '@/lib/impersonation';
import type {
  ImpersonationActionResult,
  ImpersonationStatusDTO,
} from '@/types/impersonation';

/**
 * Super Admin Action: Initiate impersonation of a company tenant.
 * Replicates Laravel WorkDo UserController@LoginWithCompany.
 */
export async function startImpersonationAction(
  companyId: string
): Promise<ImpersonationActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Unauthorized. Please log in.' };
    }

    if (session.user.role !== 'super admin') {
      return {
        success: false,
        message: 'Permission denied: Only Super Admin can impersonate company accounts.',
      };
    }

    if (!companyId || typeof companyId !== 'string') {
      return { success: false, message: 'Valid company ID is required.' };
    }

    await connectToDatabase();

    const targetUser = await User.findById(companyId);
    if (!targetUser) {
      return { success: false, message: 'Company account not found.' };
    }

    if (targetUser.role !== 'company') {
      return {
        success: false,
        message: 'Cannot impersonate non-company accounts.',
      };
    }

    if (targetUser.isActive === false) {
      return {
        success: false,
        message: 'Cannot impersonate a deactivated/suspended company account.',
      };
    }


    // Audit Logging
    try {
      const { headers } = await import('next/headers');
      const headersList = await headers();
      const forwarded = headersList.get('x-forwarded-for');
      const realIp = headersList.get('x-real-ip');
      const ip = forwarded ? forwarded.split(',')[0].trim() : (realIp || '127.0.0.1');
      const userAgent = headersList.get('user-agent') || '';

      await recordLoginAuditAction({
        userId: String(targetUser._id),
        role: targetUser.role,
        companyId: String(targetUser._id),
        ip,
        userAgent: `[Impersonated by Super Admin: ${session.user.name} (${session.user.email})] ${userAgent}`,
        status: 'success',
      });
    } catch (auditErr) {
      console.warn('Failed to record impersonation audit log:', auditErr);
    }

    const ticket = createImpersonationTicket(
      {
        id: session.user.id,
        name: session.user.name || 'Super Admin',
        email: session.user.email || '',
      },
      String(targetUser._id)
    );

    return {
      success: true,
      message: `Impersonation session authorized for ${targetUser.name}.`,
      ticket,
      redirectUrl: '/dashboard',
    };
  } catch (error) {
    console.error('[startImpersonationAction] Failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to start impersonation.',
    };
  }
}

/**
 * Action: Exit active impersonation session and restore Super Admin credentials.
 * Replicates Laravel WorkDo UserController@ExitCompany.
 */
export async function exitImpersonationAction(): Promise<ImpersonationActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Unauthorized. Please log in.' };
    }

    if (!session.user.isImpersonating || !session.user.impersonatorAdminId) {
      return {
        success: false,
        message: 'No active impersonation session detected.',
      };
    }

    await connectToDatabase();

    const originalAdmin = await User.findById(session.user.impersonatorAdminId);
    if (!originalAdmin || originalAdmin.role !== 'super admin') {
      return {
        success: false,
        message: 'Original Super Admin account could not be resolved.',
      };
    }

    // Audit Logging
    try {
      const { headers } = await import('next/headers');
      const headersList = await headers();
      const forwarded = headersList.get('x-forwarded-for');
      const realIp = headersList.get('x-real-ip');
      const ip = forwarded ? forwarded.split(',')[0].trim() : (realIp || '127.0.0.1');
      const userAgent = headersList.get('user-agent') || '';

      await recordLoginAuditAction({
        userId: String(originalAdmin._id),
        role: originalAdmin.role,
        ip,
        userAgent: `[Exited Impersonation of Company: ${session.user.name}] ${userAgent}`,
        status: 'success',
      });
    } catch (auditErr) {
      console.warn('Failed to record exit impersonation audit log:', auditErr);
    }

    const ticket = createRestoreAdminTicket({
      id: String(originalAdmin._id),
      name: originalAdmin.name,
      email: originalAdmin.email,
    });

    return {
      success: true,
      message: 'Restoring Super Admin session...',
      ticket,
      redirectUrl: '/super-admin/companies',
    };
  } catch (error) {
    console.error('[exitImpersonationAction] Failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to exit impersonation.',
    };
  }
}

/**
 * Retrieves the active impersonation status for displaying the floating UI banner.
 */
export async function getImpersonationStatusAction(): Promise<ImpersonationStatusDTO> {
  try {
    const session = await auth();
    if (!session?.user || !session.user.isImpersonating || !session.user.impersonatorAdminId) {
      return {
        isImpersonating: false,
        impersonatorAdminId: null,
        originalAdminName: null,
        originalAdminEmail: null,
        targetCompany: null,
      };
    }

    await connectToDatabase();
    const [business, companyUser] = await Promise.all([
      Business.findOne({ companyId: session.user.id }).select('name').lean(),
      User.findById(session.user.id).select('name email').lean(),
    ]);

    return {
      isImpersonating: true,
      impersonatorAdminId: session.user.impersonatorAdminId,
      originalAdminName: session.user.originalAdminName || 'Super Admin',
      originalAdminEmail: session.user.originalAdminEmail || '',
      targetCompany: companyUser
        ? {
            id: String(companyUser._id),
            name: companyUser.name,
            email: companyUser.email,
            businessName: business?.name || companyUser.name,
          }
        : null,
    };
  } catch (error) {
    console.error('[getImpersonationStatusAction] Error:', error);
    return {
      isImpersonating: false,
      impersonatorAdminId: null,
      originalAdminName: null,
      originalAdminEmail: null,
      targetCompany: null,
    };
  }
}
