'use server';

import {
  getBusinessHoursAction,
  updateBusinessHoursAction,
} from './business-hours';
import type { BusinessHourDTO } from '@/types/business-hours';

/**
 * Re-export getBusinessHoursAction and updateBusinessHoursAction under actions/business.ts
 * for developer interconnectivity and clean modular imports.
 */
export { getBusinessHoursAction, updateBusinessHoursAction };

/**
 * Convenience alias for updateBusinessHoursAction matching the requirements
 */
export async function updateBusinessHours(hours: BusinessHourDTO[]) {
  return updateBusinessHoursAction(hours);
}
