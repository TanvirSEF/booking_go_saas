'use server';

import { Types } from 'mongoose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/db';
import { Customer } from '@/models/Customer';
import { User } from '@/models/User';
import { Business } from '@/models/Business';
import { Appointment } from '@/models/Appointment';
import '@/models/Service';
import '@/models/Staff';
import '@/models/Location';
import { hashPassword } from '@/lib/password';
import type {
  CustomerCRMItem,
  CustomerAppointmentSummary,
  CustomerDetailDTO,
  CustomerFilterParams,
  CustomerListResponse,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerActionResponse,
} from '@/types/customer-crm';

const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  contact: z.string().min(5, 'Contact phone number must be at least 5 digits').trim(),
  gender: z.enum(['male', 'female', 'other', '']).optional().default(''),
  dob: z.string().optional().default(''),
  description: z.string().optional().default(''),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
});

const updateCustomerSchema = z.object({
  id: z.string().min(1, 'Customer ID is required'),
  name: z.string().min(2, 'Name must be at least 2 characters').trim().optional(),
  email: z.string().email('Invalid email address').trim().toLowerCase().optional(),
  contact: z.string().min(5, 'Contact phone number must be at least 5 digits').trim().optional(),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
  dob: z.string().optional(),
  description: z.string().optional(),
});

/**
 * Resolves the authenticated tenant and active business context.
 */
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
 * Retrieves a paginated list of company customers with live appointment aggregation metrics.
 */
export async function getCompanyCustomersAction(
  params: CustomerFilterParams = {}
): Promise<CustomerActionResponse<CustomerListResponse>> {
  try {
    const { businessId } = await resolveTenantContext();

    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 15));
    const skip = (page - 1) * limit;

    const baseFilter: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
    };

    if (params.search?.trim()) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      baseFilter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { contact: searchRegex },
      ];
    }

    const [total, rawCustomers] = await Promise.all([
      Customer.countDocuments(baseFilter),
      Customer.find(baseFilter)
        .populate<{ userId: { _id?: Types.ObjectId; email?: string; isActive?: boolean; isEnableLogin?: boolean; suspendedReason?: string; suspendedAt?: Date } }>('userId', 'email isActive isEnableLogin suspendedReason suspendedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    if (rawCustomers.length === 0) {
      return {
        success: true,
        data: {
          customers: [],
          total: 0,
          page,
          totalPages: 0,
          limit,
        },
      };
    }

    // Aggregate booking stats for the retrieved customer records
    const customerIds = rawCustomers.map((c) => c._id);
    const customerEmails = rawCustomers.map((c) => c.email.toLowerCase());

    const appointmentStats = await Appointment.aggregate([
      {
        $match: {
          businessId: new Types.ObjectId(businessId),
          $or: [
            { customerId: { $in: customerIds } },
            { email: { $in: customerEmails } },
          ],
        },
      },
      {
        $group: {
          _id: { $ifNull: ['$customerId', '$email'] },
          totalAppointments: { $sum: 1 },
          completedAppointments: {
            $sum: {
              $cond: [{ $eq: [{ $toLower: '$appointmentStatus' }, 'completed'] }, 1, 0],
            },
          },
          totalSpent: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$paymentStatus', 'paid'] },
                    { $eq: [{ $toLower: '$appointmentStatus' }, 'completed'] },
                  ],
                },
                '$price',
                0,
              ],
            },
          },
          lastAppointmentDate: { $max: '$date' },
        },
      },
    ]);

    const statsMap = new Map<string, { total: number; completed: number; spent: number; lastDate: string | null }>();
    for (const stat of appointmentStats) {
      const key = String(stat._id);
      statsMap.set(key, {
        total: stat.totalAppointments || 0,
        completed: stat.completedAppointments || 0,
        spent: stat.totalSpent || 0,
        lastDate: stat.lastAppointmentDate || null,
      });
    }

    const customers: CustomerCRMItem[] = rawCustomers.map((c) => {
      const idKey = String(c._id);
      const emailKey = c.email.toLowerCase();
      const stats = statsMap.get(idKey) || statsMap.get(emailKey) || { total: 0, completed: 0, spent: 0, lastDate: null };
      const user = c.userId as { _id?: Types.ObjectId; email?: string; isActive?: boolean; isEnableLogin?: boolean; suspendedReason?: string; suspendedAt?: Date } | null;

      return {
        id: String(c._id),
        userId: user?._id ? String(user._id) : undefined,
        name: c.name,
        email: c.email,
        contact: c.contact,
        isActive: user ? user.isActive !== false : true,
        isEnableLogin: user ? user.isEnableLogin !== false : true,
        suspendedReason: user?.suspendedReason || undefined,
        suspendedAt: user?.suspendedAt ? user.suspendedAt.toISOString() : undefined,
        gender: c.gender || '',
        dob: c.dob || '',
        description: c.description || '',
        avatar: c.avatar || '',
        totalAppointments: stats.total,
        completedAppointments: stats.completed,
        totalSpent: stats.spent,
        lastAppointmentDate: stats.lastDate,
        createdAt: c.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        customers,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve customers.';
    return { success: false, error: message };
  }
}

/**
 * Retrieves full customer details and chronological appointment history.
 */
export async function getCustomerDetailsAction(
  customerId: string
): Promise<CustomerActionResponse<CustomerDetailDTO>> {
  try {
    const { businessId } = await resolveTenantContext();

    if (!Types.ObjectId.isValid(customerId)) {
      return { success: false, error: 'Invalid customer ID format.' };
    }

    const customer = await Customer.findOne({
      _id: new Types.ObjectId(customerId),
      businessId: new Types.ObjectId(businessId),
    }).lean();

    if (!customer) {
      return { success: false, error: 'Customer not found.' };
    }

    // Fetch all appointments linked to this customer
    const rawAppointments = await Appointment.find({
      businessId: new Types.ObjectId(businessId),
      $or: [
        { customerId: customer._id },
        { email: customer.email.toLowerCase() },
      ],
    })
      .populate('serviceId', 'name')
      .populate('staffId', 'name')
      .populate('locationId', 'name')
      .sort({ date: -1, time: -1 })
      .lean();

    let totalSpent = 0;
    let completedCount = 0;

    const appointments: CustomerAppointmentSummary[] = rawAppointments.map((app) => {
      const isCompleted = app.appointmentStatus.toLowerCase() === 'completed';
      const isPaid = app.paymentStatus === 'paid';

      if (isCompleted) completedCount++;
      if (isPaid || isCompleted) totalSpent += app.price || 0;

      const serviceObj = app.serviceId as { name?: string } | null;
      const staffObj = app.staffId as { name?: string } | null;
      const locationObj = app.locationId as { name?: string } | null;

      return {
        id: String(app._id),
        appointmentNumber: app.appointmentNumber,
        serviceName: serviceObj?.name || 'Service',
        staffName: staffObj?.name || 'Staff Specialist',
        locationName: locationObj?.name || 'Location',
        date: app.date,
        time: app.time,
        price: app.price || 0,
        paymentType: app.paymentType,
        paymentStatus: app.paymentStatus,
        appointmentStatus: app.appointmentStatus,
        statusColor: app.statusColor || '#21c9b0',
        createdAt: app.createdAt.toISOString(),
      };
    });

    const customerDTO: CustomerCRMItem = {
      id: String(customer._id),
      name: customer.name,
      email: customer.email,
      contact: customer.contact,
      gender: customer.gender || '',
      dob: customer.dob || '',
      description: customer.description || '',
      avatar: customer.avatar || '',
      totalAppointments: appointments.length,
      completedAppointments: completedCount,
      totalSpent,
      lastAppointmentDate: appointments.length > 0 ? appointments[0].date : null,
      createdAt: customer.createdAt.toISOString(),
    };

    return {
      success: true,
      data: {
        customer: customerDTO,
        appointments,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve customer details.';
    return { success: false, error: message };
  }
}

/**
 * Creates a new customer profile and corresponding user record if needed.
 */
export async function createCompanyCustomerAction(
  rawInput: CreateCustomerInput
): Promise<CustomerActionResponse<CustomerCRMItem>> {
  try {
    const { companyId, businessId } = await resolveTenantContext();
    const input = createCustomerSchema.parse(rawInput);

    // Check if customer profile already exists under this business
    const existingCustomer = await Customer.findOne({
      businessId: new Types.ObjectId(businessId),
      email: input.email,
    }).lean();

    if (existingCustomer) {
      return { success: false, error: 'A customer with this email already exists in this business.' };
    }

    // Check or create linked user account
    let user = await User.findOne({ email: input.email });
    if (!user) {
      const hashedPassword = await hashPassword(input.password || 'Customer@123');
      user = await User.create({
        name: input.name,
        email: input.email,
        mobileNo: input.contact,
        role: 'customer',
        password: hashedPassword,
        companyId,
        activeBusinessId: businessId,
        isActive: true,
      });
    }

    const newCustomer = await Customer.create({
      companyId,
      businessId,
      userId: user._id,
      name: input.name,
      email: input.email,
      contact: input.contact,
      gender: input.gender || '',
      dob: input.dob || '',
      description: input.description || '',
    });

    revalidatePath('/customers');

    return {
      success: true,
      message: 'Customer successfully created.',
      data: {
        id: String(newCustomer._id),
        name: newCustomer.name,
        email: newCustomer.email,
        contact: newCustomer.contact,
        gender: newCustomer.gender,
        dob: newCustomer.dob,
        description: newCustomer.description,
        totalAppointments: 0,
        completedAppointments: 0,
        totalSpent: 0,
        lastAppointmentDate: null,
        createdAt: newCustomer.createdAt.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create customer.';
    return { success: false, error: message };
  }
}

/**
 * Updates an existing customer profile and syncs linked User account.
 */
export async function updateCompanyCustomerAction(
  rawInput: UpdateCustomerInput
): Promise<CustomerActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();
    const input = updateCustomerSchema.parse(rawInput);

    if (!Types.ObjectId.isValid(input.id)) {
      return { success: false, error: 'Invalid customer ID.' };
    }

    const customer = await Customer.findOne({
      _id: new Types.ObjectId(input.id),
      businessId: new Types.ObjectId(businessId),
    });

    if (!customer) {
      return { success: false, error: 'Customer not found.' };
    }

    if (input.name !== undefined) customer.name = input.name;
    if (input.contact !== undefined) customer.contact = input.contact;
    if (input.gender !== undefined) customer.gender = input.gender;
    if (input.dob !== undefined) customer.dob = input.dob;
    if (input.description !== undefined) customer.description = input.description;

    if (input.email && input.email !== customer.email) {
      const emailCollision = await Customer.findOne({
        businessId: new Types.ObjectId(businessId),
        email: input.email,
        _id: { $ne: customer._id },
      }).lean();

      if (emailCollision) {
        return { success: false, error: 'Another customer with this email already exists.' };
      }
      customer.email = input.email;
    }

    await customer.save();

    // Sync linked user profile if exists
    if (customer.userId) {
      await User.findByIdAndUpdate(customer.userId, {
        ...(input.name ? { name: input.name } : {}),
        ...(input.email ? { email: input.email } : {}),
        ...(input.contact ? { mobileNo: input.contact } : {}),
      });
    }

    revalidatePath('/customers');

    return {
      success: true,
      message: 'Customer information updated successfully.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update customer.';
    return { success: false, error: message };
  }
}

/**
 * Deletes a customer record safely with active appointment protection.
 */
export async function deleteCompanyCustomerAction(
  customerId: string
): Promise<CustomerActionResponse> {
  try {
    const { businessId } = await resolveTenantContext();

    if (!Types.ObjectId.isValid(customerId)) {
      return { success: false, error: 'Invalid customer ID.' };
    }

    const customer = await Customer.findOne({
      _id: new Types.ObjectId(customerId),
      businessId: new Types.ObjectId(businessId),
    });

    if (!customer) {
      return { success: false, error: 'Customer not found.' };
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Check if customer has active upcoming appointments
    const upcomingActiveBooking = await Appointment.findOne({
      businessId: new Types.ObjectId(businessId),
      $or: [
        { customerId: customer._id },
        { email: customer.email.toLowerCase() },
      ],
      date: { $gte: todayStr },
      appointmentStatus: { $in: ['Pending', 'Confirmed', 'pending', 'confirmed'] },
    }).lean();

    if (upcomingActiveBooking) {
      return {
        success: false,
        error: `Cannot delete customer. They have an upcoming active appointment (${upcomingActiveBooking.appointmentNumber} on ${upcomingActiveBooking.date}).`,
      };
    }

    await Customer.deleteOne({ _id: customer._id });

    revalidatePath('/customers');

    return {
      success: true,
      message: `Customer ${customer.name} was successfully removed.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete customer.';
    return { success: false, error: message };
  }
}
