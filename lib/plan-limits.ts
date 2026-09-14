import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { Location } from '@/models/Location';
import { Service } from '@/models/Service';
import { Plan, type IPlan } from '@/models/Plan';

export type PlanResource = 'users' | 'businesses' | 'locations' | 'services';

export interface PlanUsage {
  users: number;
  businesses: number;
  locations: number;
  services: number;
}

export interface PlanLimitCheckResult {
  allowed: boolean;
  current: number;
  max: number;
  message?: string;
}

/**
 * Retrieves the active subscription plan for a given company.
 */
export async function getCompanyPlan(
  companyId: string | Types.ObjectId
): Promise<IPlan | null> {
  await connectToDatabase();

  const companyObjectId = typeof companyId === 'string' ? new Types.ObjectId(companyId) : companyId;
  const companyUser = await User.findById(companyObjectId).select('activePlanId').lean();

  if (!companyUser || !companyUser.activePlanId) {
    // Fallback to default free plan if available
    const freePlan = await Plan.findOne({ isFreePlan: true, isEnabled: true }).lean();
    return freePlan as IPlan | null;
  }

  const plan = await Plan.findById(companyUser.activePlanId).lean();
  return plan as IPlan | null;
}

/**
 * Calculates current resource usage across all businesses belonging to a company.
 */
export async function getCompanyUsage(
  companyId: string | Types.ObjectId
): Promise<PlanUsage> {
  await connectToDatabase();

  const companyObjectId = typeof companyId === 'string' ? new Types.ObjectId(companyId) : companyId;

  const [usersCount, businessesCount, locationsCount, servicesCount] = await Promise.all([
    User.countDocuments({ companyId: companyObjectId }),
    Business.countDocuments({ companyId: companyObjectId }),
    Location.countDocuments({ companyId: companyObjectId }),
    Service.countDocuments({ companyId: companyObjectId }),
  ]);

  return {
    users: usersCount,
    businesses: businessesCount,
    locations: locationsCount,
    services: servicesCount,
  };
}

/**
 * Validates whether a company has capacity to provision another unit of a given resource.
 * Limit of -1 indicates unlimited capacity.
 */
export async function checkPlanLimit(
  companyId: string | Types.ObjectId,
  resource: PlanResource
): Promise<PlanLimitCheckResult> {
  await connectToDatabase();

  const plan = await getCompanyPlan(companyId);

  if (!plan) {
    return {
      allowed: false,
      current: 0,
      max: 0,
      message: 'No active plan found for this organization.',
    };
  }

  const usage = await getCompanyUsage(companyId);
  const current = usage[resource];

  let max = 0;
  switch (resource) {
    case 'users':
      max = plan.maxUsers;
      break;
    case 'businesses':
      max = plan.maxBusinesses;
      break;
    case 'locations':
      max = plan.maxLocations;
      break;
    case 'services':
      max = plan.maxServices;
      break;
  }

  // -1 signifies unlimited resources
  if (max === -1) {
    return {
      allowed: true,
      current,
      max,
    };
  }

  const allowed = current < max;

  return {
    allowed,
    current,
    max,
    message: allowed
      ? undefined
      : `Your plan limit for ${resource} has been reached (${current}/${max}). Please upgrade your plan.`,
  };
}
