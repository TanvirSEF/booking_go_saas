'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Role, type IRoleDocument } from '@/models/Role';
import { Staff } from '@/models/Staff';
import { User, type IUserDocument } from '@/models/User';
import {
  ensureDefaultRolesForCompany,
  getAvailablePermissionsGrouped,
  getUserEffectivePermissions,
} from '@/lib/permissions';
import {
  createRoleSchema,
  updateRoleSchema,
  assignStaffRoleSchema,
  type RoleDTO,
  type StaffRoleDetailsDTO,
  type CreateRoleInput,
  type UpdateRoleInput,
  type AssignStaffRoleInput,
  type RoleActionResult,
  type PermissionModuleGroup,
} from '@/types/role-permission';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op in background tasks or testing
  }
}

/**
 * Resolves active user and company context from session.
 */
async function resolveCompanyContext() {
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

  const companyId =
    user.role === 'company'
      ? user._id
      : user.companyId
        ? new Types.ObjectId(user.companyId)
        : user._id;

  return {
    userId,
    companyId,
    userRole: user.role,
  };
}

/**
 * 1. Retrieves all roles for the active company with assigned staff counts.
 * Automatically seeds default roles (Manager, Receptionist, Staff) if not present.
 */
export async function getCompanyRolesAction(): Promise<RoleActionResult<RoleDTO[]>> {
  try {
    const { companyId } = await resolveCompanyContext();

    await ensureDefaultRolesForCompany(companyId);

    const roles = await Role.find({ companyId }).sort({ isDefault: -1, createdAt: 1 }).lean<IRoleDocument[]>();

    // Compute staff counts per role
    const staffCounts = await Staff.aggregate([
      { $match: { companyId } },
      { $group: { _id: '$roleId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    for (const item of staffCounts) {
      if (item._id) {
        countMap.set(String(item._id), item.count);
      }
    }

    const data: RoleDTO[] = roles.map((r) => ({
      id: String(r._id),
      name: r.name,
      description: r.description || '',
      permissions: r.permissions || [],
      isDefault: Boolean(r.isDefault),
      systemKey: r.systemKey || null,
      staffCount: countMap.get(String(r._id)) || 0,
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: r.updatedAt ? r.updatedAt.toISOString() : new Date().toISOString(),
    }));

    return {
      success: true,
      data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve company roles.';
    return { success: false, error: message };
  }
}

/**
 * 2. Retrieves available system permissions grouped by functional module.
 */
export async function getAvailablePermissionsAction(): Promise<
  RoleActionResult<PermissionModuleGroup[]>
> {
  try {
    const groups = getAvailablePermissionsGrouped();
    return {
      success: true,
      data: groups,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load permissions dictionary.';
    return { success: false, error: message };
  }
}

/**
 * 3. Creates a new custom role for the active company.
 */
export async function createRoleAction(
  rawInput: CreateRoleInput
): Promise<RoleActionResult<RoleDTO>> {
  try {
    const { companyId } = await resolveCompanyContext();
    const validated = createRoleSchema.parse(rawInput);

    // Check for duplicate role name in this company
    const existing = await Role.findOne({
      companyId,
      name: { $regex: new RegExp(`^${validated.name.trim()}$`, 'i') },
    });

    if (existing) {
      return {
        success: false,
        error: `A role with name "${validated.name}" already exists in your organization.`,
      };
    }

    const newRole = await Role.create({
      companyId,
      name: validated.name.trim(),
      description: validated.description?.trim() || '',
      permissions: Array.from(new Set(validated.permissions)),
      isDefault: false,
    });

    safeRevalidatePath('/dashboard/staff');
    safeRevalidatePath('/dashboard/settings');

    return {
      success: true,
      message: `Role "${newRole.name}" created successfully.`,
      data: {
        id: String(newRole._id),
        name: newRole.name,
        description: newRole.description || '',
        permissions: newRole.permissions || [],
        isDefault: false,
        systemKey: null,
        staffCount: 0,
        createdAt: newRole.createdAt.toISOString(),
        updatedAt: newRole.createdAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create role.';
    return { success: false, error: message };
  }
}

/**
 * 4. Updates an existing custom role's name, description, and permissions.
 */
export async function updateRoleAction(
  rawInput: UpdateRoleInput
): Promise<RoleActionResult<RoleDTO>> {
  try {
    const { companyId } = await resolveCompanyContext();
    const validated = updateRoleSchema.parse(rawInput);

    const role = await Role.findOne({ _id: validated.id, companyId });
    if (!role) {
      return { success: false, error: 'Role not found or access denied.' };
    }

    // Check if another role has the same name
    const duplicate = await Role.findOne({
      _id: { $ne: role._id },
      companyId,
      name: { $regex: new RegExp(`^${validated.name.trim()}$`, 'i') },
    });

    if (duplicate) {
      return {
        success: false,
        error: `Another role with name "${validated.name}" already exists.`,
      };
    }

    // If it is a default role, keep the default name fixed to preserve system expectations
    if (role.isDefault && role.name !== validated.name.trim()) {
      return {
        success: false,
        error: 'System default role names cannot be modified. You can update their permission matrix.',
      };
    }

    role.name = validated.name.trim();
    role.description = validated.description?.trim() || '';
    role.permissions = Array.from(new Set(validated.permissions));
    await role.save();

    const staffCount = await Staff.countDocuments({ companyId, roleId: role._id });

    safeRevalidatePath('/dashboard/staff');
    safeRevalidatePath('/dashboard/settings');

    return {
      success: true,
      message: `Role "${role.name}" updated successfully.`,
      data: {
        id: String(role._id),
        name: role.name,
        description: role.description || '',
        permissions: role.permissions,
        isDefault: role.isDefault,
        systemKey: role.systemKey || null,
        staffCount,
        createdAt: role.createdAt.toISOString(),
        updatedAt: role.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update role.';
    return { success: false, error: message };
  }
}

/**
 * 5. Deletes a custom role with safety guards against deleting active roles or defaults.
 */
export async function deleteRoleAction(roleId: string): Promise<RoleActionResult<{ id: string }>> {
  try {
    const { companyId } = await resolveCompanyContext();

    if (!roleId || !Types.ObjectId.isValid(roleId)) {
      return { success: false, error: 'Invalid role ID provided.' };
    }

    const role = await Role.findOne({ _id: new Types.ObjectId(roleId), companyId });
    if (!role) {
      return { success: false, error: 'Role not found or access denied.' };
    }

    if (role.isDefault) {
      return {
        success: false,
        error: 'Default system roles (Manager, Receptionist, Staff) cannot be deleted.',
      };
    }

    // Prevent deletion if staff members are currently assigned to this role
    const activeStaffCount = await Staff.countDocuments({ companyId, roleId: role._id });
    if (activeStaffCount > 0) {
      return {
        success: false,
        error: `Cannot delete role "${role.name}". It is currently assigned to ${activeStaffCount} staff member(s). Please reassign them first.`,
      };
    }

    await Role.deleteOne({ _id: role._id });

    safeRevalidatePath('/dashboard/staff');
    safeRevalidatePath('/dashboard/settings');

    return {
      success: true,
      message: `Role "${role.name}" was successfully deleted.`,
      data: { id: roleId },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete role.';
    return { success: false, error: message };
  }
}

/**
 * 6. Assigns a role and optional custom permissions to a staff member.
 */
export async function assignStaffRoleAction(
  rawInput: AssignStaffRoleInput
): Promise<RoleActionResult<StaffRoleDetailsDTO>> {
  try {
    const { companyId } = await resolveCompanyContext();
    const validated = assignStaffRoleSchema.parse(rawInput);

    const staff = await Staff.findOne({ _id: validated.staffId, companyId });
    if (!staff) {
      return { success: false, error: 'Staff member not found or access denied.' };
    }

    const role = await Role.findOne({ _id: validated.roleId, companyId });
    if (!role) {
      return { success: false, error: 'Selected role not found in this company.' };
    }

    staff.roleId = role._id as Types.ObjectId;
    staff.customPermissions = Array.from(new Set(validated.customPermissions || []));
    await staff.save();

    // Keep linked User account roleId in sync
    if (staff.userId) {
      await User.findByIdAndUpdate(staff.userId, { roleId: role._id });
    }

    const user = await User.findById(staff.userId).lean<IUserDocument>();
    const effectivePermissions = await getUserEffectivePermissions(staff.userId);

    safeRevalidatePath('/dashboard/staff');

    return {
      success: true,
      message: `Assigned role "${role.name}" to ${staff.name}.`,
      data: {
        staffId: String(staff._id),
        staffName: staff.name,
        email: user?.email || '',
        roleId: String(role._id),
        roleName: role.name,
        isDefaultRole: role.isDefault,
        effectivePermissions,
        customPermissions: staff.customPermissions,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to assign role to staff.';
    return { success: false, error: message };
  }
}

/**
 * 7. Retrieves detailed role and effective permissions for a specific staff member.
 */
export async function getStaffRoleDetailsAction(
  staffId: string
): Promise<RoleActionResult<StaffRoleDetailsDTO>> {
  try {
    const { companyId } = await resolveCompanyContext();

    const staff = await Staff.findOne({ _id: staffId, companyId }).lean();
    if (!staff) {
      return { success: false, error: 'Staff member not found.' };
    }

    const user = await User.findById(staff.userId).lean<IUserDocument>();

    let roleName = 'Staff Specialist';
    let isDefault = true;
    if (staff.roleId) {
      const role = await Role.findById(staff.roleId).lean();
      if (role) {
        roleName = role.name;
        isDefault = role.isDefault;
      }
    }

    const effectivePermissions = await getUserEffectivePermissions(staff.userId);

    return {
      success: true,
      data: {
        staffId: String(staff._id),
        staffName: staff.name,
        email: user?.email || '',
        roleId: staff.roleId ? String(staff.roleId) : null,
        roleName,
        isDefaultRole: isDefault,
        effectivePermissions,
        customPermissions: Array.isArray(staff.customPermissions) ? staff.customPermissions : [],
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve staff role details.';
    return { success: false, error: message };
  }
}
