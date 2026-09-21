import { connectToDatabase } from '@/lib/db';
import { Language, type ILanguage } from '@/models/Language';
import { Translation } from '@/models/Translation';
import type { Types } from 'mongoose';

export interface SystemLanguageSeed {
  code: string;
  name: string;
  direction: 'ltr' | 'rtl';
  isDefault?: boolean;
}

export const SYSTEM_LANGUAGES: SystemLanguageSeed[] = [
  { code: 'ar', name: 'Arabic', direction: 'rtl' },
  { code: 'da', name: 'Danish', direction: 'ltr' },
  { code: 'de', name: 'German', direction: 'ltr' },
  { code: 'en', name: 'English', direction: 'ltr', isDefault: true },
  { code: 'es', name: 'Spanish', direction: 'ltr' },
  { code: 'fr', name: 'French', direction: 'ltr' },
  { code: 'it', name: 'Italian', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', direction: 'ltr' },
  { code: 'nl', name: 'Dutch', direction: 'ltr' },
  { code: 'pl', name: 'Polish', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', direction: 'ltr' },
  { code: 'ru', name: 'Russian', direction: 'ltr' },
  { code: 'tr', name: 'Turkish', direction: 'ltr' },
];

export const BASE_TRANSLATION_DICTIONARY: Record<string, Record<string, string>> = {
  general: {
    'actions': 'Actions',
    'active': 'Active',
    'back': 'Back',
    'cancel': 'Cancel',
    'close': 'Close',
    'confirm': 'Confirm',
    'create': 'Create',
    'delete': 'Delete',
    'edit': 'Edit',
    'error': 'Error',
    'export': 'Export',
    'filter': 'Filter',
    'import': 'Import',
    'inactive': 'Inactive',
    'loading': 'Loading...',
    'no': 'No',
    'save': 'Save Changes',
    'search': 'Search',
    'status': 'Status',
    'success': 'Success',
    'view': 'View',
    'yes': 'Yes',
  },
  auth: {
    'already_have_account': 'Already have an account?',
    'dont_have_account': "Don't have an account?",
    'email': 'Email Address',
    'forgot_password': 'Forgot Password?',
    'login': 'Log In',
    'login_subtitle': 'Sign in to access your dashboard',
    'logout': 'Sign Out',
    'password': 'Password',
    'remember_me': 'Remember Me',
    'reset_password': 'Reset Password',
    'signup': 'Sign Up',
  },
  dashboard: {
    'active_services': 'Active Services',
    'analytics': 'Analytics',
    'dashboard': 'Dashboard',
    'overview': 'Overview',
    'recent_bookings': 'Recent Bookings',
    'total_appointments': 'Total Appointments',
    'total_customers': 'Total Customers',
    'total_revenue': 'Total Revenue',
  },
  appointments: {
    'book_appointment': 'Book Appointment',
    'booking_confirmed': 'Booking Confirmed',
    'cancelled': 'Cancelled',
    'completed': 'Completed',
    'customer_details': 'Customer Details',
    'payment_method': 'Payment Method',
    'pending': 'Pending',
    'reschedule': 'Reschedule',
    'select_date_time': 'Select Date & Time',
    'select_service': 'Select Service',
    'select_staff': 'Select Staff',
  },
  services: {
    'assign_staff': 'Assign Staff',
    'category': 'Category',
    'duration': 'Duration',
    'price': 'Price',
    'service_name': 'Service Name',
    'services': 'Services',
  },
  billing: {
    'bank_transfer': 'Bank Transfer',
    'current_plan': 'Current Plan',
    'invoice': 'Invoice',
    'monthly': 'Monthly',
    'order_history': 'Order History',
    'pay_now': 'Pay Now',
    'plans': 'Subscription Plans',
    'stripe': 'Credit Card (Stripe)',
    'upgrade_plan': 'Upgrade Plan',
    'yearly': 'Yearly',
  },
  customer: {
    'customer_portal': 'Customer Portal',
    'history': 'Appointment History',
    'my_appointments': 'My Appointments',
    'notes': 'Notes',
    'phone': 'Phone Number',
    'profile': 'Customer Profile',
  },
  settings: {
    'business_profile': 'Business Profile',
    'custom_domain': 'Custom Domain',
    'email_notifications': 'Email Notifications',
    'holidays': 'Holidays',
    'languages': 'Language Settings',
    'settings': 'Settings',
    'theme_customizer': 'Theme Customizer',
    'working_hours': 'Working Hours',
  },
  emails: {
    'appointment_confirmation': 'Your appointment has been confirmed',
    'password_reset_request': 'Reset Your Password',
    'payment_received': 'Payment Received Successfully',
    'reminder_notification': 'Upcoming Appointment Reminder',
    'welcome_email': 'Welcome to BookingGo',
  },
};

import { SystemSetting } from '@/models/SystemSetting';

export const SYSTEM_LANGUAGES_SEEDED_KEY = 'system_languages_seeded';

/**
 * Initializes and seeds standard 13 system languages and baseline English dictionary.
 * Guaranteed to only run once on initial setup so that user deletions are permanent.
 */
export async function ensureDefaultLanguagesSeeded(force = false): Promise<void> {
  await connectToDatabase();

  if (!force) {
    const alreadySeeded = await SystemSetting.findOne({ key: SYSTEM_LANGUAGES_SEEDED_KEY });
    if (alreadySeeded?.value === 'yes') {
      return;
    }

    const languageCount = await Language.countDocuments();
    if (languageCount > 0) {
      // System already has languages created
      await SystemSetting.findOneAndUpdate(
        { key: SYSTEM_LANGUAGES_SEEDED_KEY },
        {
          $set: {
            key: SYSTEM_LANGUAGES_SEEDED_KEY,
            value: 'yes',
            group: 'system',
            isPublic: false,
            isSensitive: false,
            description: 'Flag indicating default system languages have been seeded',
          },
        },
        { upsert: true }
      );
      return;
    }
  }

  // 1. Seed system languages
  for (const item of SYSTEM_LANGUAGES) {
    const existing = await Language.findOne({ code: item.code });
    if (!existing) {
      await Language.create({
        code: item.code,
        name: item.name,
        direction: item.direction,
        isDefault: Boolean(item.isDefault),
        status: true,
      });
    } else {
      // Ensure 'en' is marked default if no other default exists
      if (item.isDefault && !existing.isDefault) {
        existing.isDefault = true;
        await existing.save();
      }
    }
  }

  // 2. Seed English baseline translation keys
  for (const [group, dict] of Object.entries(BASE_TRANSLATION_DICTIONARY)) {
    const bulkOps = Object.entries(dict).map(([key, val]) => ({
      updateOne: {
        filter: { languageCode: 'en', group, key, companyId: null },
        update: {
          $setOnInsert: {
            languageCode: 'en',
            group,
            key,
            value: val,
            companyId: null,
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await Translation.bulkWrite(bulkOps);
    }
  }

  // Mark language seeding complete in SystemSetting
  await SystemSetting.findOneAndUpdate(
    { key: SYSTEM_LANGUAGES_SEEDED_KEY },
    {
      $set: {
        key: SYSTEM_LANGUAGES_SEEDED_KEY,
        value: 'yes',
        group: 'system',
        isPublic: false,
        isSensitive: false,
        description: 'Flag indicating default system languages have been seeded',
      },
    },
    { upsert: true }
  );
}

/**
 * Resolves translation dictionary with 3-tier cascade:
 * Tenant Override (if companyId) -> Active Language Translation -> English Default Fallback -> Raw Key
 */
export async function resolveTranslationsCascade(params: {
  languageCode: string;
  group?: string;
  companyId?: Types.ObjectId | null;
}): Promise<{
  translations: Record<string, string>;
  language: ILanguage | null;
}> {
  await connectToDatabase();
  await ensureDefaultLanguagesSeeded();

  const langCode = (params.languageCode || 'en').toLowerCase().trim();
  const groupFilter = params.group ? { group: params.group } : {};

  // Fetch language entity
  const language = await Language.findOne({ code: langCode, status: true }).lean();

  // 1. Load English default system dictionary as base fallback
  const baseEnglish = await Translation.find({
    languageCode: 'en',
    companyId: null,
    ...groupFilter,
  }).lean();

  const resolved: Record<string, string> = {};
  for (const item of baseEnglish) {
    resolved[item.key] = item.value;
  }

  // 2. If target language is NOT English, overlay target language translations
  if (langCode !== 'en') {
    const targetTranslations = await Translation.find({
      languageCode: langCode,
      companyId: null,
      ...groupFilter,
    }).lean();

    for (const item of targetTranslations) {
      if (item.value && item.value.trim() !== '') {
        resolved[item.key] = item.value;
      }
    }
  }

  // 3. If tenant companyId provided, overlay tenant-specific custom overrides
  if (params.companyId) {
    const tenantOverrides = await Translation.find({
      languageCode: langCode,
      companyId: params.companyId,
      ...groupFilter,
    }).lean();

    for (const item of tenantOverrides) {
      if (item.value && item.value.trim() !== '') {
        resolved[item.key] = item.value;
      }
    }
  }

  return {
    translations: resolved,
    language: language as ILanguage | null,
  };
}
