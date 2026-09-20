'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Staff, STAFF_DEFAULT_COLORS } from '@/models/Staff';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { Role } from '@/models/Role';
import { ensureDefaultRolesForCompany } from '@/lib/permissions';
import '@/models/Location';
import '@/models/Service';
import { Appointment } from '@/models/Appointment';
import { checkPlanLimit } from '@/lib/plan-limits';
import { hashPassword } from '@/lib/password';
import type {
  StaffMemberDTO,
  CreateStaffInput,
  UpdateStaffInput,
  StaffListResponse,
  StaffActionResponse,
} from '@/types/staff';

const createStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional().default(''),
  roleId: z.string().optional(),
  locationIds: z.array(z.string()).default([]),
  serviceIds: z.array(z.string()).default([]),
  description: z.string().optional().default(''),
  colorCode: z.string().optional(),
  isActive: z.boolean().default(true),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
});

const updateStaffSchema = z.object({
  id: z.string().min(1, 'Staff ID is required'),
  name: z.string().min(2, 'Name must be at least 2 characters').trim().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  roleId: z.string().optional(),
  locationIds: z.array(z.string()).optional(),
  serviceIds: z.array(z.string()).optional(),
  description: z.string().optional(),
  colorCode: z.string().optional(),
  isActive: z.boolean().optional(),
});

async function resolveTenantContext() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized. Please log in.');
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id).lean();
  if (!user) {
    throw new Error('User account not found.');
  }

  const companyId =
    user.role === 'company'
      ? user._id
      : user.companyId
        ? new Types.ObjectId(user.companyId)
        : null;

  if (!companyId) {
    throw new Error('Company context could not be determined.');
  }

  let activeBusinessId = user.activeBusinessId;
  if (!activeBusinessId) {
    const defaultBusiness = await Business.findOne({ companyId }).lean();
    if (defaultBusiness) {
      activeBusinessId = defaultBusiness._id;
      await User.findByIdAndUpdate(user._id, { activeBusinessId: defaultBusiness._id });
    }
  }

  if (!activeBusinessId) {
    throw new Error('No active business found for this organization.');
  }

  return {
    userId: user._id,
    companyId,
    businessId: activeBusinessId,
  };
}

/**
 * Fetch all staff members for active business with plan limits & populated relations.
 */
export async function getStaffListAction(): Promise<StaffListResponse> {
  try {
    const { companyId, businessId } = await resolveTenantContext();

    const [staffDocs, quota] = await Promise.all([
      Staff.find({ companyId, businessId })
        .populate<{ userId: { _id?: Types.ObjectId; email?: string; mobileNo?: string } }>('userId', 'email mobileNo')
        .populate<{ roleId: { _id?: Types.ObjectId; name?: string } }>('roleId', 'name')
        .populate<{ locationIds: Array<{ _id: Types.ObjectId; name: string }> }>('locationIds', 'name')
        .populate<{ serviceIds: Array<{ _id: Types.ObjectId; name: string; price: number; duration: number }> }>('serviceIds', 'name price duration')
        .sort({ createdAt: -1 })
        .lean(),
      checkPlanLimit(companyId, 'users'),
    ]);

    const data: StaffMemberDTO[] = staffDocs.map((doc) => {
      const user = doc.userId as { _id?: Types.ObjectId; email?: string; mobileNo?: string } | null;
      const role = doc.roleId as { _id?: Types.ObjectId; name?: string } | null;
      const locations = (doc.locationIds || []) as unknown as Array<{ _id: Types.ObjectId; name: string }>;
      const services = (doc.serviceIds || []) as unknown as Array<{ _id: Types.ObjectId; name: string; price?: number; duration?: number }>;

      return {
        _id: String(doc._id),
        companyId: String(doc.companyId),
        businessId: String(doc.businessId),
        userId: user?._id ? String(user._id) : undefined,
        roleId: role?._id ? String(role._id) : undefined,
        roleName: role?.name || 'Staff Specialist',
        name: doc.name,
        email: user?.email || '',
        phone: user?.mobileNo || '',
        description: doc.description || '',
        colorCode: doc.colorCode || '#CEEDC1',
        isActive: doc.isActive ?? true,
        locationIds: (doc.locationIds || []).map((id) => String((id as { _id?: Types.ObjectId })._id || id)),
        locations: locations.map((loc) => ({
          _id: String(loc._id),
          name: loc.name || 'Unnamed Location',
        })),
        serviceIds: (doc.serviceIds || []).map((id) => String((id as { _id?: Types.ObjectId })._id || id)),
        services: services.map((svc) => ({
          _id: String(svc._id),
          name: svc.name || 'Unnamed Service',
          price: svc.price,
          duration: svc.duration,
        })),
        createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
      };
    });

    return {
      success: true,
      data,
      quota: {
        current: quota.current,
        max: quota.max,
        allowed: quota.allowed,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch staff members.';
    return { success: false, error: message };
  }
}

/**
 * Create a new staff member with plan quota enforcement and optional user login.
 */
export async function createStaffAction(input: CreateStaffInput): Promise<StaffActionResponse> {
  try {
    const { companyId, businessId } = await resolveTenantContext();

    const validated = createStaffSchema.parse(input);

    // 1. Plan limit verification (staff members count against tenant user limit)
    const quota = await checkPlanLimit(companyId, 'users');
    if (!quota.allowed) {
      return {
        success: false,
        error: `Staff/User quota reached (${quota.current}/${quota.max}). Please upgrade your subscription plan to add more staff.`,
      };
    }

    // 2. Resolve or create linked user
    let staffUserId: Types.ObjectId;
    const targetEmail = validated.email
      ? validated.email.toLowerCase().trim()
      : `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@system.booking-go.internal`;

    const existingUser = await User.findOne({ email: targetEmail });
    // Resolve role assignment
    let assignedRoleId: Types.ObjectId | undefined;
    if (validated.roleId) {
      const role = await Role.findOne({ _id: validated.roleId, companyId });
      if (role) {
        assignedRoleId = role._id as Types.ObjectId;
      }
    }
    if (!assignedRoleId) {
      await ensureDefaultRolesForCompany(companyId);
      const defaultRole = await Role.findOne({ companyId, systemKey: 'staff' });
      if (defaultRole) {
        assignedRoleId = defaultRole._id as Types.ObjectId;
      }
    }

    if (existingUser) {
      // Check if user is already assigned to a staff profile in this business
      const existingStaff = await Staff.findOne({ userId: existingUser._id, businessId });
      if (existingStaff) {
        return {
          success: false,
          error: 'A staff member with this email is already registered in this business.',
        };
      }
      staffUserId = existingUser._id as Types.ObjectId;
      if (assignedRoleId) {
        await User.findByIdAndUpdate(staffUserId, { roleId: assignedRoleId });
      }
    } else {
      const hashedPassword = validated.password
        ? await hashPassword(validated.password)
        : await hashPassword(Math.random().toString(36).substring(2, 12));

      const newUser = await User.create({
        name: validated.name,
        email: targetEmail,
        password: hashedPassword,
        mobileNo: validated.phone || '',
        role: 'staff',
        roleId: assignedRoleId,
        companyId,
        activeBusinessId: businessId,
        isActive: validated.isActive,
      });
      staffUserId = newUser._id as Types.ObjectId;
    }

    // 3. Assign color code
    const colorCode =
      validated.colorCode && validated.colorCode.startsWith('#')
        ? validated.colorCode
        : STAFF_DEFAULT_COLORS[Math.floor(Math.random() * STAFF_DEFAULT_COLORS.length)];

    // 4. Create Staff Record
    const newStaff = await Staff.create({
      companyId,
      businessId,
      userId: staffUserId,
      roleId: assignedRoleId,
      name: validated.name,
      locationIds: validated.locationIds.map((id) => new Types.ObjectId(id)),
      serviceIds: validated.serviceIds.map((id) => new Types.ObjectId(id)),
      description: validated.description || '',
      colorCode,
      isActive: validated.isActive,
    });

    revalidatePath('/dashboard/staff');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: {
        _id: String(newStaff._id),
        companyId: String(companyId),
        businessId: String(businessId),
        userId: String(staffUserId),
        name: newStaff.name,
        email: targetEmail.includes('@system.booking-go.internal') ? '' : targetEmail,
        phone: validated.phone || '',
        description: newStaff.description || '',
        colorCode: newStaff.colorCode,
        isActive: newStaff.isActive,
        locationIds: validated.locationIds,
        locations: [],
        serviceIds: validated.serviceIds,
        services: [],
        createdAt: newStaff.createdAt.toISOString(),
        updatedAt: newStaff.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((i) => i.message).join(', ') };
    }
    const message = error instanceof Error ? error.message : 'Failed to create staff member.';
    return { success: false, error: message };
  }
}

/**
 * Update staff details (services, locations, bio, active status).
 */
export async function updateStaffAction(input: UpdateStaffInput): Promise<StaffActionResponse> {
  try {
    const { companyId, businessId } = await resolveTenantContext();

    const validated = updateStaffSchema.parse(input);

    const staff = await Staff.findOne({
      _id: new Types.ObjectId(validated.id),
      companyId,
      businessId,
    });

    if (!staff) {
      return { success: false, error: 'Staff member not found or unauthorized.' };
    }

    if (validated.name !== undefined) staff.name = validated.name;
    if (validated.description !== undefined) staff.description = validated.description;
    if (validated.colorCode !== undefined) staff.colorCode = validated.colorCode;
    if (validated.isActive !== undefined) staff.isActive = validated.isActive;
    if (validated.locationIds !== undefined) {
      staff.locationIds = validated.locationIds.map((id) => new Types.ObjectId(id));
    }
    if (validated.serviceIds !== undefined) {
      staff.serviceIds = validated.serviceIds.map((id) => new Types.ObjectId(id));
    }
    if (validated.roleId !== undefined) {
      if (validated.roleId) {
        const role = await Role.findOne({ _id: validated.roleId, companyId });
        if (role) {
          staff.roleId = role._id as Types.ObjectId;
          await User.findByIdAndUpdate(staff.userId, { roleId: role._id });
        }
      }
    }

    await staff.save();

    // If email or phone provided, update linked User
    if (validated.email !== undefined || validated.phone !== undefined || validated.name !== undefined) {
      const userUpdate: Record<string, unknown> = {};
      if (validated.name) userUpdate.name = validated.name;
      if (validated.phone !== undefined) userUpdate.mobileNo = validated.phone;
      if (validated.email && !validated.email.includes('@system.booking-go.internal')) {
        userUpdate.email = validated.email.toLowerCase().trim();
      }
      if (validated.isActive !== undefined) userUpdate.isActive = validated.isActive;

      if (Object.keys(userUpdate).length > 0) {
        await User.findByIdAndUpdate(staff.userId, userUpdate);
      }
    }

    revalidatePath('/dashboard/staff');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: {
        _id: String(staff._id),
        companyId: String(staff.companyId),
        businessId: String(staff.businessId),
        userId: String(staff.userId),
        name: staff.name,
        description: staff.description || '',
        colorCode: staff.colorCode,
        isActive: staff.isActive,
        locationIds: staff.locationIds.map((id) => String(id)),
        locations: [],
        serviceIds: staff.serviceIds.map((id) => String(id)),
        services: [],
        createdAt: staff.createdAt.toISOString(),
        updatedAt: staff.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((i) => i.message).join(', ') };
    }
    const message = error instanceof Error ? error.message : 'Failed to update staff member.';
    return { success: false, error: message };
  }
}

/**
 * Toggle staff active status for quick dashboard toggle.
 */
export async function toggleStaffStatusAction(id: string): Promise<StaffActionResponse> {
  try {
    const { companyId, businessId } = await resolveTenantContext();

    const staff = await Staff.findOne({
      _id: new Types.ObjectId(id),
      companyId,
      businessId,
    });

    if (!staff) {
      return { success: false, error: 'Staff member not found.' };
    }

    staff.isActive = !staff.isActive;
    await staff.save();

    await User.findByIdAndUpdate(staff.userId, { isActive: staff.isActive });

    revalidatePath('/dashboard/staff');

    return {
      success: true,
      data: {
        _id: String(staff._id),
        companyId: String(staff.companyId),
        businessId: String(staff.businessId),
        userId: String(staff.userId),
        name: staff.name,
        description: staff.description || '',
        colorCode: staff.colorCode,
        isActive: staff.isActive,
        locationIds: staff.locationIds.map((locId) => String(locId)),
        locations: [],
        serviceIds: staff.serviceIds.map((svcId) => String(svcId)),
        services: [],
        createdAt: staff.createdAt.toISOString(),
        updatedAt: staff.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to toggle staff status.';
    return { success: false, error: message };
  }
}

/**
 * Delete staff member with integrity checks for upcoming bookings.
 */
export async function deleteStaffAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { companyId, businessId } = await resolveTenantContext();

    const staff = await Staff.findOne({
      _id: new Types.ObjectId(id),
      companyId,
      businessId,
    });

    if (!staff) {
      return { success: false, error: 'Staff member not found.' };
    }

    // Safety check: Don't allow deletion if there are active future appointments
    const today = new Date().toISOString().split('T')[0];
    const upcomingAppointmentsCount = await Appointment.countDocuments({
      staffId: staff._id,
      date: { $gte: today },
      appointmentStatus: { $in: ['Pending', 'Confirmed'] },
    });

    if (upcomingAppointmentsCount > 0) {
      return {
        success: false,
        error: `Cannot delete staff member with ${upcomingAppointmentsCount} upcoming appointment(s). Please reassign or cancel their appointments first, or deactivate the staff member.`,
      };
    }

    await Staff.findByIdAndDelete(staff._id);

    revalidatePath('/dashboard/staff');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete staff member.';
    return { success: false, error: message };
  }
}
