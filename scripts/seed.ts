import mongoose from 'mongoose';
import { hashPassword } from '../lib/password';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { Plan } from '../models/Plan';
import { Location } from '../models/Location';
import { Category } from '../models/Category';
import { Service } from '../models/Service';
import { Staff } from '../models/Staff';
import { CustomStatus } from '../models/CustomStatus';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment.');
  process.exit(1);
}

async function seed() {
  console.log('🌱 Starting BookingGo SaaS Database Seeder...');
  await mongoose.connect(MONGODB_URI as string);
  console.log('✅ Connected to MongoDB Atlas.');

  const defaultPassword = await hashPassword('1234');

  // 1. Seed Plans
  console.log('📦 Seeding Subscription Plans...');
  let freePlan = await Plan.findOne({ name: 'Basic' });
  if (!freePlan) {
    freePlan = await Plan.create({
      name: 'Basic',
      packagePriceMonthly: 0,
      packagePriceYearly: 0,
      pricePerUserMonthly: 0,
      pricePerUserYearly: 0,
      pricePerBusinessMonthly: 0,
      pricePerBusinessYearly: 0,
      maxUsers: 5,
      maxBusinesses: 5,
      maxLocations: 5,
      maxServices: 10,
      storageLimitMb: 1024,
      modules: ['Stripe', 'Paypal', 'GoogleCaptcha'],
      isCustomPlan: false,
      isFreePlan: true,
      hasTrial: false,
      trialDays: 0,
      isEnabled: true,
      description: 'Default free plan for starter businesses.',
    });
  }

  let proPlan = await Plan.findOne({ name: 'Pro Business' });
  if (!proPlan) {
    proPlan = await Plan.create({
      name: 'Pro Business',
      packagePriceMonthly: 29,
      packagePriceYearly: 290,
      pricePerUserMonthly: 5,
      pricePerUserYearly: 50,
      pricePerBusinessMonthly: 10,
      pricePerBusinessYearly: 100,
      maxUsers: 25,
      maxBusinesses: 10,
      maxLocations: -1, // unlimited
      maxServices: -1, // unlimited
      storageLimitMb: 10240,
      modules: ['Stripe', 'Paypal', 'GoogleCaptcha', 'Photography', 'CarService'],
      isCustomPlan: false,
      isFreePlan: false,
      hasTrial: true,
      trialDays: 14,
      isEnabled: true,
      description: 'Professional tier with unlimited services and locations.',
    });
  }

  // 2. Seed Super Admin
  console.log('👤 Seeding Super Admin...');
  let superAdmin = await User.findOne({ email: 'superadmin@example.com' });
  if (!superAdmin) {
    superAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@example.com',
      password: defaultPassword,
      role: 'super admin',
      isActive: true,
      emailVerifiedAt: new Date(),
    });
  } else {
    superAdmin.password = defaultPassword;
    superAdmin.isActive = true;
    await superAdmin.save();
  }

  // 3. Seed Company User
  console.log('🏢 Seeding Company User...');
  let companyUser = await User.findOne({ email: 'company@example.com' });
  if (!companyUser) {
    companyUser = await User.create({
      name: 'WorkDo',
      email: 'company@example.com',
      password: defaultPassword,
      role: 'company',
      activePlanId: freePlan._id,
      isActive: true,
      emailVerifiedAt: new Date(),
    });
  } else {
    companyUser.password = defaultPassword;
    companyUser.activePlanId = freePlan._id;
    companyUser.isActive = true;
    await companyUser.save();
  }

  // 4. Seed Business
  console.log('🏬 Seeding Business...');
  let business = await Business.findOne({ slug: 'workdo' });
  if (!business) {
    business = await Business.create({
      companyId: companyUser._id,
      name: 'WorkDo Salon & Spa',
      slug: 'workdo',
      formType: 'form-layout',
      layout: 'Formlayout1',
      themeColor: 'color1-Formlayout1',
      currency: 'USD',
      currencySymbol: '$',
      appointmentPrefix: '#APP000',
      maximumSlot: 1,
      appointmentReminderHours: 24,
      businessHours: [
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
      ],
      holidays: [],
      settings: {
        company_name: 'WorkDo Salon & Spa',
        company_email: 'contact@workdo.com',
      },
    });
  }

  // Link active business to company user
  companyUser.activeBusinessId = business._id;
  await companyUser.save();

  // 5. Seed Location
  console.log('📍 Seeding Location...');
  let location = await Location.findOne({ businessId: business._id, name: 'Downtown Flagship' });
  if (!location) {
    location = await Location.create({
      companyId: companyUser._id,
      businessId: business._id,
      name: 'Downtown Flagship',
      address: '123 Market Street, Suite 400',
      phone: '+1 555-0199',
      description: 'Main flagship salon and spa boutique.',
      isActive: true,
    });
  }

  // 6. Seed Category
  console.log('📂 Seeding Category...');
  let category = await Category.findOne({ businessId: business._id, name: 'Hair Styling & Care' });
  if (!category) {
    category = await Category.create({
      companyId: companyUser._id,
      businessId: business._id,
      name: 'Hair Styling & Care',
      description: 'Expert haircutting, styling, coloring and deep care treatments.',
    });
  }

  // 7. Seed Services
  console.log('✂️ Seeding Services...');
  let haircutService = await Service.findOne({
    businessId: business._id,
    name: 'Signature Haircut & Blowdry',
  });
  if (!haircutService) {
    haircutService = await Service.create({
      companyId: companyUser._id,
      businessId: business._id,
      categoryId: category._id,
      name: 'Signature Haircut & Blowdry',
      price: 45,
      durationMinutes: 30,
      description: 'Includes personal consultation, wash, precision cut and blowout.',
      isFree: false,
      isActive: true,
    });
  }

  let keratinService = await Service.findOne({
    businessId: business._id,
    name: 'Premium Keratin Treatment',
  });
  if (!keratinService) {
    keratinService = await Service.create({
      companyId: companyUser._id,
      businessId: business._id,
      categoryId: category._id,
      name: 'Premium Keratin Treatment',
      price: 120,
      durationMinutes: 60,
      description: 'Professional smoothing and revitalizing keratin hair treatment.',
      isFree: false,
      isActive: true,
    });
  }

  // 8. Seed Staff Member & Staff User
  console.log('👨‍💼 Seeding Staff Member...');
  let staffUser = await User.findOne({ email: 'staff@example.com' });
  if (!staffUser) {
    staffUser = await User.create({
      name: 'Sarah Connor',
      email: 'staff@example.com',
      password: defaultPassword,
      role: 'staff',
      companyId: companyUser._id,
      activeBusinessId: business._id,
      isActive: true,
      emailVerifiedAt: new Date(),
    });
  } else {
    staffUser.password = defaultPassword;
    staffUser.companyId = companyUser._id;
    staffUser.activeBusinessId = business._id;
    staffUser.isActive = true;
    await staffUser.save();
  }

  let staff = await Staff.findOne({ userId: staffUser._id });
  if (!staff) {
    staff = await Staff.create({
      companyId: companyUser._id,
      businessId: business._id,
      userId: staffUser._id,
      name: 'Sarah Connor',
      locationIds: [location._id],
      serviceIds: [haircutService._id, keratinService._id],
      colorCode: '#CEEDC1',
      description: 'Senior stylist with 8+ years experience.',
      isActive: true,
    });
  } else {
    staff.locationIds = [location._id];
    staff.serviceIds = [haircutService._id, keratinService._id];
    staff.isActive = true;
    await staff.save();
  }

  // 9. Seed Custom Statuses
  console.log('🏷️ Seeding Custom Statuses...');
  const defaultStatuses = [
    { title: 'Pending', statusColor: '#3b82f6', icon: 'ti-loader', order: 1 },
    { title: 'Confirmed', statusColor: '#10b981', icon: 'ti-check', order: 2 },
    { title: 'In Progress', statusColor: '#f59e0b', icon: 'ti-calendar-event', order: 3 },
    { title: 'Completed', statusColor: '#8b5cf6', icon: 'ti-thumb-up', order: 4 },
    { title: 'Cancelled', statusColor: '#ef4444', icon: 'ti-ban', order: 5 },
  ];

  for (const st of defaultStatuses) {
    const exists = await CustomStatus.findOne({ businessId: business._id, title: st.title });
    if (!exists) {
      await CustomStatus.create({
        companyId: companyUser._id,
        businessId: business._id,
        title: st.title,
        statusColor: st.statusColor,
        icon: st.icon,
        order: st.order,
      });
    }
  }

  console.log('----------------------------------------------------');
  console.log('🎉 Database seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('🔑 Credentials Summary:');
  console.log('   - Super Admin : superadmin@example.com / 1234');
  console.log('   - Company     : company@example.com    / 1234');
  console.log('   - Staff       : staff@example.com      / 1234');
  console.log('🏬 Seeded Business:');
  console.log(`   - Name : ${business.name}`);
  console.log(`   - Slug : ${business.slug}`);
  console.log(`   - ID   : ${business._id}`);
  console.log('✂️ Seeded Services:');
  console.log(`   - Haircut ($45, 30m) : ${haircutService._id}`);
  console.log(`   - Keratin ($120, 60m): ${keratinService._id}`);
  console.log('📍 Seeded Location:');
  console.log(`   - ${location.name} : ${location._id}`);
  console.log('----------------------------------------------------');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed with error:', err);
  process.exit(1);
});
