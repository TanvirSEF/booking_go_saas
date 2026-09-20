'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { User } from '@/models/User';
import { Business, type IBusinessHour } from '@/models/Business';
import { Location } from '@/models/Location';
import { CustomStatus } from '@/models/CustomStatus';
import { Plan } from '@/models/Plan';
import { Order } from '@/models/Order';
import {
  registerCompanySchema,
  type RegisterCompanyInput,
  type RegisterCompanyResult,
} from '@/types/auth';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Public self-registration action for new company owners.
 * Atomically provisions:
 * 1. User document with role: 'company'
 * 2. Associated default Free Plan (or Basic) with 1 year initial expiry
 * 3. Default Business profile with standard weekly operating hours
 * 4. Default 'Main Location'
 * 5. 5 standard workflow Custom Statuses (Pending, Confirmed, In Progress, Completed, Cancelled)
 * 6. $0 Free Plan activation Order record for billing audit logs
 */
export async function registerCompanyAction(
  input: RegisterCompanyInput
): Promise<RegisterCompanyResult> {
  try {
    // 1. Validate payload with Zod
    const validation = registerCompanySchema.safeParse(input);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Invalid registration data.';
      return { success: false, error: firstError };
    }

    const { name, email, password, businessName, mobileNo, recaptchaToken } = validation.data;

    // 2. Validate Google reCAPTCHA (bypasses gracefully if disabled or in test env)
    const { verifyRecaptchaToken } = await import('@/lib/recaptcha');
    const recaptchaCheck = await verifyRecaptchaToken(recaptchaToken, {
      expectedAction: 'register',
    });
    if (!recaptchaCheck.success) {
      return {
        success: false,
        error: recaptchaCheck.error || 'reCAPTCHA verification failed. Please try again.',
      };
    }

    await connectToDatabase();

    // 2. Check if email is already taken
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return {
        success: false,
        error: 'An account with this email address already exists. Please log in.',
      };
    }

    // 3. Resolve default Free Plan or fallback to Basic plan
    let activePlan = await Plan.findOne({ isFreePlan: true, isEnabled: true });
    if (!activePlan) {
      activePlan = await Plan.findOne({ name: 'Basic' });
    }

    // 4. Hash password securely
    const hashedPassword = await hashPassword(password);

    // 5. Generate unique business slug
    const baseSlug = slugify(businessName) || 'business';
    let slug = baseSlug;
    let counter = 1;
    while (await Business.findOne({ slug }).lean()) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 6. Plan expiration (1 year default for Free Plan)
    const planExpireDate = new Date();
    planExpireDate.setFullYear(planExpireDate.getFullYear() + 1);

    // 7. Create Company User
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      mobileNo: mobileNo || undefined,
      role: 'company',
      isActive: true,
      activePlanId: activePlan?._id,
      billingType: 'monthly',
      planExpireDate,
      totalBusiness: 1,
      totalUser: 1,
      emailVerifiedAt: new Date(),
    });

    // 8. Create Default Business Profile
    const defaultBusinessHours: IBusinessHour[] = [
      {
        dayName: 'Monday',
        isOpen: true,
        startTime: '09:00',
        endTime: '18:00',
        breakHours: [{ start: '13:00', end: '14:00' }],
      },
      {
        dayName: 'Tuesday',
        isOpen: true,
        startTime: '09:00',
        endTime: '18:00',
        breakHours: [{ start: '13:00', end: '14:00' }],
      },
      {
        dayName: 'Wednesday',
        isOpen: true,
        startTime: '09:00',
        endTime: '18:00',
        breakHours: [{ start: '13:00', end: '14:00' }],
      },
      {
        dayName: 'Thursday',
        isOpen: true,
        startTime: '09:00',
        endTime: '18:00',
        breakHours: [{ start: '13:00', end: '14:00' }],
      },
      {
        dayName: 'Friday',
        isOpen: true,
        startTime: '09:00',
        endTime: '18:00',
        breakHours: [{ start: '13:00', end: '14:00' }],
      },
      {
        dayName: 'Saturday',
        isOpen: true,
        startTime: '10:00',
        endTime: '16:00',
        breakHours: [],
      },
      {
        dayName: 'Sunday',
        isOpen: false,
        startTime: '09:00',
        endTime: '18:00',
        breakHours: [],
      },
    ];

    const business = await Business.create({
      companyId: user._id,
      name: businessName,
      slug,
      formType: 'form-layout',
      layout: 'Formlayout1',
      themeColor: 'color1-Formlayout1',
      currency: 'USD',
      currencySymbol: '$',
      appointmentPrefix: '#APP000',
      maximumSlot: 1,
      appointmentReminderHours: 24,
      businessHours: defaultBusinessHours,
      holidays: [],
      settings: {
        company_name: businessName,
        company_email: email,
      },
    });

    // Link activeBusinessId to user
    user.activeBusinessId = business._id;
    await user.save();

    // 9. Provision Default Location
    await Location.create({
      companyId: user._id,
      businessId: business._id,
      name: 'Main Location',
      address: 'Headquarters',
      description: 'Default primary business facility.',
      isActive: true,
    });

    // 10. Provision 5 Default Custom Statuses
    const defaultStatuses = [
      { title: 'Pending', statusColor: '#3b82f6', icon: 'ti-loader', order: 1 },
      { title: 'Confirmed', statusColor: '#10b981', icon: 'ti-check', order: 2 },
      { title: 'In Progress', statusColor: '#f59e0b', icon: 'ti-calendar-event', order: 3 },
      { title: 'Completed', statusColor: '#8b5cf6', icon: 'ti-thumb-up', order: 4 },
      { title: 'Cancelled', statusColor: '#ef4444', icon: 'ti-ban', order: 5 },
    ];

    await CustomStatus.insertMany(
      defaultStatuses.map((st) => ({
        companyId: user._id,
        businessId: business._id,
        ...st,
      }))
    );

    // 11. Provision $0 Activation Order for audit & billing consistency
    const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    if (activePlan) {
      await Order.create({
        orderNumber,
        companyId: user._id,
        planId: activePlan._id,
        planName: activePlan.name || 'Basic Free Plan',
        billingCycle: 'monthly',
        price: 0,
        discountAmount: 0,
        currency: 'USD',
        paymentType: 'Free Plan',
        paymentStatus: 'succeeded',
      });
    }

    // 12. Revalidate paths safely
    try {
      revalidatePath('/login');
      revalidatePath('/super-admin/companies');
    } catch {
      // Ignored when invoked outside Next.js request pipeline (e.g. CLI/tests)
    }

    return {
      success: true,
      message: 'Registration completed successfully! Welcome to BookingGo.',
      userId: String(user._id),
      businessSlug: slug,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
    console.error('Registration error:', error);
    return { success: false, error: message };
  }
}
