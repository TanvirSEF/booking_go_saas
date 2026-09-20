import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';

/**
 * Validates real-time active status, login permission, and token version against Atlas.
 * Enforces immediate session termination upon suspension or login disablement.
 * Also checks parent company status for staff and customer roles.
 */
export async function verifyUserActiveStatus(
  userId: string,
  tokenVersion?: number
): Promise<boolean> {
  await connectToDatabase();

  const user = await User.findById(userId)
    .select('isActive isEnableLogin tokenVersion companyId role')
    .lean();

  if (!user || user.isActive === false || user.isEnableLogin === false) {
    return false;
  }

  if (tokenVersion !== undefined && user.tokenVersion !== tokenVersion) {
    return false;
  }

  // Parent company cascade check: If parent company is disabled, block staff/customer login
  if (user.companyId && (user.role === 'staff' || user.role === 'customer')) {
    const company = await User.findById(user.companyId)
      .select('isActive isEnableLogin')
      .lean();
    if (company && (company.isActive === false || company.isEnableLogin === false)) {
      return false;
    }
  }

  return true;
}
