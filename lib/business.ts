import 'server-only';
import { cache } from 'react';
import { connectToDatabase } from '@/lib/db';
import { Business } from '@/models/Business';
import type { Role } from '@/lib/roles';

export interface ActiveBusinessUser {
  id: string;
  role?: Role;
  companyId?: string | null;
  activeBusinessId?: string | null;
}

/**
 * Resolves the active business for the logged-in user with strict tenant scoping.
 * Scoping by companyId ensures a user cannot read another tenant's business even with a tampered activeBusinessId.
 */
export const getActiveBusiness = cache(
  async (user: ActiveBusinessUser) => {
    await connectToDatabase();

    // 1. If Super Admin has an active business selected, allow tenant view
    if (user.role === 'super admin' && user.activeBusinessId) {
      const active = await Business.findById(user.activeBusinessId)
        .select('name slug currencySymbol')
        .lean();
      if (active) return active;
    }

    // 2. For company or staff, strictly scope lookup by companyId
    const companyId = user.companyId || user.id;

    if (user.activeBusinessId) {
      const active = await Business.findOne({ _id: user.activeBusinessId, companyId })
        .select('name slug currencySymbol')
        .lean();
      if (active) return active;
    }

    return Business.findOne({ companyId }).select('name slug currencySymbol').lean();
  }
);
