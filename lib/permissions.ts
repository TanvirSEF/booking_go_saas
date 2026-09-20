import { Types } from 'mongoose';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Role, type IRoleDocument } from '@/models/Role';
import { Staff } from '@/models/Staff';
import { User, type IUserDocument } from '@/models/User';
import type {
  PermissionDefinition,
  PermissionModuleGroup,
} from '@/types/role-permission';

export const MASTER_PERMISSIONS: PermissionDefinition[] = [
  // 1. Appointments
  {
    key: 'appointments.view',
    label: 'View Appointments',
    description: 'View appointment calendar and bookings list',
    module: 'Appointments',
  },
  {
    key: 'appointments.create',
    label: 'Create Bookings',
    description: 'Manually schedule new appointments for customers',
    module: 'Appointments',
  },
  {
    key: 'appointments.edit',
    label: 'Edit Appointments',
    description: 'Modify booking time slots, assigned staff, or status',
    module: 'Appointments',
  },
  {
    key: 'appointments.cancel',
    label: 'Cancel Appointments',
    description: 'Cancel customer appointments with reason tracking',
    module: 'Appointments',
  },
  {
    key: 'appointments.delete',
    label: 'Delete Appointments',
    description: 'Permanently remove appointment records',
    module: 'Appointments',
  },

  // 2. Services & Catalog
  {
    key: 'services.view',
    label: 'View Services',
    description: 'View service catalog, duration, and pricing',
    module: 'Services',
  },
  {
    key: 'services.manage',
    label: 'Manage Services',
    description: 'Create, edit, toggle, or delete services and categories',
    module: 'Services',
  },

  // 3. Staff & Team
  {
    key: 'staff.view',
    label: 'View Staff Directory',
    description: 'View staff members, availability, and color codes',
    module: 'Staff',
  },
  {
    key: 'staff.manage',
    label: 'Manage Staff Members',
    description: 'Add new staff members, assign locations, and edit profiles',
    module: 'Staff',
  },

  // 4. Customers & CRM
  {
    key: 'customers.view',
    label: 'View Customers',
    description: 'View customer directory and past appointment histories',
    module: 'Customers',
  },
  {
    key: 'customers.manage',
    label: 'Manage Customers',
    description: 'Create, update customer contact details or notes',
    module: 'Customers',
  },

  // 5. Business Operations
  {
    key: 'business_hours.manage',
    label: 'Manage Operating Hours',
    description: 'Configure business opening hours and break intervals',
    module: 'Operations',
  },
  {
    key: 'holidays.manage',
    label: 'Manage Holidays',
    description: 'Add or remove business closed days and holiday calendar',
    module: 'Operations',
  },
  {
    key: 'locations.manage',
    label: 'Manage Locations',
    description: 'Add or modify branch locations and physical addresses',
    module: 'Operations',
  },

  // 6. Financials & Analytics
  {
    key: 'revenue.view',
    label: 'View Financial Revenue',
    description: 'Access billing history, sales revenue cards, and transaction reports',
    module: 'Financials',
  },

  // 7. Administration & Roles
  {
    key: 'roles.manage',
    label: 'Manage Roles & Permissions',
    description: 'Create, edit custom roles, and assign permissions to staff',
    module: 'Administration',
  },
  {
    key: 'settings.manage',
    label: 'Manage Business Settings',
    description: 'Configure branding, email notifications, and business preferences',
    module: 'Administration',
  },
];

export const DEFAULT_ROLE_TEMPLATES = [
  {
    name: 'Manager',
    systemKey: 'manager',
    description: 'Full administrative access across all business features and revenue metrics',
    permissions: MASTER_PERMISSIONS.map((p) => p.key),
  },
  {
    name: 'Receptionist',
    systemKey: 'receptionist',
    description: 'Front-desk operations for appointments, scheduling, and customer management',
    permissions: [
      'appointments.view',
      'appointments.create',
      'appointments.edit',
      'appointments.cancel',
      'customers.view',
      'customers.manage',
      'services.view',
      'staff.view',
    ],
  },
  {
    name: 'Staff Specialist',
    systemKey: 'staff',
    description: 'Standard staff specialist access to view assigned appointments and customers',
    permissions: [
      'appointments.view',
      'appointments.edit',
      'customers.view',
      'services.view',
    ],
  },
];

/**
 * Returns available master permissions grouped by functional module.
 */
export function getAvailablePermissionsGrouped(): PermissionModuleGroup[] {
  const groupsMap = new Map<string, PermissionDefinition[]>();

  for (const perm of MASTER_PERMISSIONS) {
    const existing = groupsMap.get(perm.module) || [];
    existing.push(perm);
    groupsMap.set(perm.module, existing);
  }

  const moduleDescriptions: Record<string, string> = {
    Appointments: 'Controls appointment booking, editing, rescheduling, and cancellations',
    Services: 'Controls access to service catalog, pricing, and category setup',
    Staff: 'Controls team member management and provider profiles',
    Customers: 'Controls client contact info and customer CRM profiles',
    Operations: 'Controls branch locations, working hours, and holiday schedules',
    Financials: 'Controls access to financial reports, payment summaries, and revenue metrics',
    Administration: 'Controls tenant settings, custom roles, and security policies',
  };

  return Array.from(groupsMap.entries()).map(([module, permissions]) => ({
    module,
    label: `${module} Management`,
    description: moduleDescriptions[module] || `${module} permissions`,
    permissions,
  }));
}

/**
 * Ensures baseline default roles (Manager, Receptionist, Staff) exist for a company.
 */
export async function ensureDefaultRolesForCompany(
  companyId: Types.ObjectId | string
): Promise<IRoleDocument[]> {
  await connectToDatabase();
  const companyObjectId = typeof companyId === 'string' ? new Types.ObjectId(companyId) : companyId;

  const existingRoles = await Role.find({ companyId: companyObjectId });
  const existingNames = new Set(existingRoles.map((r) => r.name.toLowerCase()));

  const rolesToCreate = [];
  for (const template of DEFAULT_ROLE_TEMPLATES) {
    if (!existingNames.has(template.name.toLowerCase())) {
      rolesToCreate.push({
        companyId: companyObjectId,
        name: template.name,
        description: template.description,
        permissions: template.permissions,
        isDefault: true,
        systemKey: template.systemKey,
      });
    }
  }

  if (rolesToCreate.length > 0) {
    await Role.insertMany(rolesToCreate);
  }

  return Role.find({ companyId: companyObjectId });
}

/**
 * Resolves the full effective set of permissions for a user.
 */
export async function getUserEffectivePermissions(
  userId: Types.ObjectId | string
): Promise<string[]> {
  await connectToDatabase();
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

  const user = await User.findById(userObjectId).lean<IUserDocument>();
  if (!user) return [];

  // Super Admin & Company Owners have unrestricted authority
  if (user.role === 'super admin' || user.role === 'company') {
    return ['*'];
  }

  // If user is a staff member
  if (user.role === 'staff') {
    const staffDoc = await Staff.findOne({ userId: userObjectId }).lean();
    if (!staffDoc) return [];

    let rolePermissions: string[] = [];

    // Check staff roleId first, then user.roleId fallback
    const targetRoleId = staffDoc.roleId || user.roleId;
    if (targetRoleId) {
      const roleDoc = await Role.findById(targetRoleId).lean();
      if (roleDoc && Array.isArray(roleDoc.permissions)) {
        rolePermissions = roleDoc.permissions;
      }
    } else if (staffDoc.companyId) {
      // Auto-fallback to company's default Staff role if not assigned
      const defaultStaffRole = await Role.findOne({
        companyId: staffDoc.companyId,
        systemKey: 'staff',
      }).lean();
      if (defaultStaffRole && Array.isArray(defaultStaffRole.permissions)) {
        rolePermissions = defaultStaffRole.permissions;
      }
    }

    const customPerms = Array.isArray(staffDoc.customPermissions) ? staffDoc.customPermissions : [];
    const merged = Array.from(new Set([...rolePermissions, ...customPerms]));
    return merged;
  }

  // Customer role has basic appointment viewing privilege
  if (user.role === 'customer') {
    return ['appointments.view'];
  }

  return [];
}

/**
 * Checks whether a user holds a required permission or set of permissions.
 */
export async function hasPermission(
  userId: Types.ObjectId | string,
  requiredPermission: string | string[]
): Promise<boolean> {
  const permissions = await getUserEffectivePermissions(userId);

  // Wildcard grants everything
  if (permissions.includes('*')) {
    return true;
  }

  const required = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
  return required.every((req) => permissions.includes(req));
}

/**
 * Server Action guard helper that enforces permission checks on the active session.
 */
export async function requirePermission(
  requiredPermission: string | string[]
): Promise<{
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  businessId: Types.ObjectId;
  role: string;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Please log in to perform this action.');
  }

  await connectToDatabase();
  const userId = new Types.ObjectId(session.user.id);
  const user = await User.findById(userId).lean<IUserDocument>();

  if (!user) {
    throw new Error('User account not found.');
  }

  const authorized = await hasPermission(userId, requiredPermission);
  if (!authorized) {
    const permString = Array.isArray(requiredPermission) ? requiredPermission.join(', ') : requiredPermission;
    throw new Error(`Permission denied: You do not have permission (${permString}) to perform this action.`);
  }

  const companyId =
    user.role === 'company'
      ? user._id
      : user.companyId
        ? new Types.ObjectId(user.companyId)
        : user._id;

  const businessId = user.activeBusinessId
    ? new Types.ObjectId(user.activeBusinessId)
    : new Types.ObjectId('000000000000000000000000');

  return {
    userId,
    companyId,
    businessId,
    role: user.role,
  };
}
