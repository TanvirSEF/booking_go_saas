'use server';

import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import {
  getDatabaseHealth,
  auditOrphanedRecords,
  vacuumDatabase,
} from '@/lib/database-maintenance-engine';
import type {
  DatabaseHealthReport,
  OrphanAuditReport,
  VacuumOptions,
  VacuumExecutionResult,
} from '@/types/maintenance';

async function resolveAuthUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized. Please log in.');
  }

  await connectToDatabase();
  const user = await User.findById(session.user.id).lean();
  if (!user) {
    throw new Error('User account not found.');
  }

  return user;
}

/**
 * Super Admin Action: Retrieve full database health diagnostic, latency, collection stats, and indexes.
 */
export async function getDatabaseHealthAction(): Promise<{
  success: boolean;
  data?: DatabaseHealthReport;
  error?: string;
}> {
  try {
    const user = await resolveAuthUser();
    if (user.role !== 'super admin') {
      return { success: false, error: 'Forbidden. Super Admin privileges required.' };
    }

    const data = await getDatabaseHealth();
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve database health.';
    return { success: false, error: message };
  }
}

/**
 * Super Admin / Tenant Action: Audit database for orphaned and dangling references.
 * Can be platform-wide (Super Admin) or scoped to a specific businessId.
 */
export async function auditDatabaseOrphansAction(businessId?: string): Promise<{
  success: boolean;
  data?: OrphanAuditReport;
  error?: string;
}> {
  try {
    const user = await resolveAuthUser();

    if (businessId) {
      const business = await Business.findById(businessId).lean();
      if (!business) {
        return { success: false, error: 'Business not found.' };
      }
      if (user.role !== 'super admin' && String(business.companyId) !== String(user._id)) {
        return { success: false, error: 'Forbidden. You do not have ownership of this business.' };
      }
    } else if (user.role !== 'super admin') {
      return { success: false, error: 'Forbidden. Super Admin privileges required for platform-wide audit.' };
    }

    const data = await auditOrphanedRecords(businessId);
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to audit database orphans.';
    return { success: false, error: message };
  }
}

/**
 * Super Admin / Tenant Action: Execute database vacuum and log pruning.
 * Defaults to dry-run mode unless explicitly set to dryRun: false.
 */
export async function runDatabaseVacuumAction(options: VacuumOptions = {}): Promise<{
  success: boolean;
  data?: VacuumExecutionResult;
  error?: string;
}> {
  try {
    const user = await resolveAuthUser();

    if (options.businessId) {
      const business = await Business.findById(options.businessId).lean();
      if (!business) {
        return { success: false, error: 'Business not found.' };
      }
      if (user.role !== 'super admin' && String(business.companyId) !== String(user._id)) {
        return { success: false, error: 'Forbidden. You do not have ownership of this business.' };
      }
    } else if (user.role !== 'super admin') {
      return { success: false, error: 'Forbidden. Super Admin privileges required for platform-wide vacuum.' };
    }

    const data = await vacuumDatabase(options);
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database vacuum operation failed.';
    return { success: false, error: message };
  }
}
