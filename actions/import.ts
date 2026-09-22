'use server';

import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import {
  importCustomersFromCsv,
  importServicesFromCsv,
  importStaffFromCsv,
  restoreTenantFromBackupBundle,
} from '@/lib/tenant-import-engine';
import type {
  ImportConflictStrategy,
  ImportBatchResult,
  RestoreBundleResult,
} from '@/types/import';
import type { TenantBackupBundle } from '@/types/export';

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

async function verifyBusinessOwnership(businessId: string, user: { _id: unknown; role: string }) {
  await connectToDatabase();
  const business = await Business.findById(businessId).lean();
  if (!business) {
    throw new Error('Business not found.');
  }

  if (user.role !== 'super admin' && String(business.companyId) !== String(user._id)) {
    throw new Error('Forbidden. You do not have ownership access to this business.');
  }

  return business;
}

/**
 * Bulk imports customers into a tenant business from RFC 4180 CSV text.
 */
export async function importCustomersCsvAction(
  businessId: string,
  csvContent: string,
  strategy: ImportConflictStrategy = 'skip'
): Promise<{
  success: boolean;
  data?: ImportBatchResult;
  error?: string;
}> {
  try {
    const user = await resolveAuthUser();
    await verifyBusinessOwnership(businessId, user);

    if (!csvContent || typeof csvContent !== 'string') {
      return { success: false, error: 'CSV content must not be empty.' };
    }

    const result = await importCustomersFromCsv(businessId, csvContent, strategy);
    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import customers.';
    return { success: false, error: message };
  }
}

/**
 * Bulk imports services into a tenant business from RFC 4180 CSV text.
 */
export async function importServicesCsvAction(
  businessId: string,
  csvContent: string,
  strategy: ImportConflictStrategy = 'skip'
): Promise<{
  success: boolean;
  data?: ImportBatchResult;
  error?: string;
}> {
  try {
    const user = await resolveAuthUser();
    await verifyBusinessOwnership(businessId, user);

    if (!csvContent || typeof csvContent !== 'string') {
      return { success: false, error: 'CSV content must not be empty.' };
    }

    const result = await importServicesFromCsv(businessId, csvContent, strategy);
    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import services.';
    return { success: false, error: message };
  }
}

/**
 * Bulk imports staff specialists into a tenant business from RFC 4180 CSV text.
 */
export async function importStaffCsvAction(
  businessId: string,
  csvContent: string,
  strategy: ImportConflictStrategy = 'skip'
): Promise<{
  success: boolean;
  data?: ImportBatchResult;
  error?: string;
}> {
  try {
    const user = await resolveAuthUser();
    await verifyBusinessOwnership(businessId, user);

    if (!csvContent || typeof csvContent !== 'string') {
      return { success: false, error: 'CSV content must not be empty.' };
    }

    const result = await importStaffFromCsv(businessId, csvContent, strategy);
    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import staff.';
    return { success: false, error: message };
  }
}

/**
 * Restores a tenant business from a JSON backup bundle with dry-run support.
 */
export async function restoreTenantBackupBundleAction(
  businessId: string,
  bundleData: TenantBackupBundle | string,
  dryRun = false
): Promise<{
  success: boolean;
  data?: RestoreBundleResult;
  error?: string;
}> {
  try {
    const user = await resolveAuthUser();
    await verifyBusinessOwnership(businessId, user);

    let bundle: TenantBackupBundle;
    if (typeof bundleData === 'string') {
      bundle = JSON.parse(bundleData) as TenantBackupBundle;
    } else {
      bundle = bundleData;
    }

    const result = await restoreTenantFromBackupBundle(businessId, bundle, { dryRun });
    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to restore backup bundle.';
    return { success: false, error: message };
  }
}
