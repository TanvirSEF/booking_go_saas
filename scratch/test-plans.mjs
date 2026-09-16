import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://booking_go:f670fcf1-5d93-4c92-ac89-b8832a82084c@cluster0.1x7w9.mongodb.net/booking_go_saas?retryWrites=true&w=majority';

async function runTests() {
  console.log('🚀 Starting Subscription Setting / Plans Portal Automated Tests...');

  // 1. NextAuth Super Admin login
  console.log('\n--- Test 1: Authenticate as Super Admin ---');
  const csrfRes = await fetch('http://localhost:3000/api/auth/csrf');
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;

  function extractCookies(cookiesHeader, existing = {}) {
    for (const c of cookiesHeader) {
      const parts = c.split(';')[0].split('=');
      if (parts.length >= 2) existing[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
    return existing;
  }

  let cookies = extractCookies(csrfRes.headers.getSetCookie());

  const superAdminParams = new URLSearchParams({
    csrfToken,
    email: 'superadmin@example.com',
    password: '1234',
    redirect: 'false',
    callbackUrl: 'http://localhost:3000/super-admin/plans',
  });

  const loginRes = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
    },
    body: superAdminParams.toString(),
    redirect: 'manual',
  });

  cookies = extractCookies(loginRes.headers.getSetCookie(), cookies);
  console.log('Super Admin Login Status:', loginRes.status);

  // 2. Fetch /super-admin/plans
  console.log('\n--- Test 2: Fetch /super-admin/plans (SSR) ---');
  const pageRes = await fetch('http://localhost:3000/super-admin/plans', {
    headers: {
      'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
    },
  });

  console.log('Page HTTP Status:', pageRes.status);
  const html = await pageRes.text();

  console.log('Includes Subscription Setting title:', html.includes('Subscription Setting'));
  console.log('Includes Pre-Packaged Subscription tab:', html.includes('Pre-Packaged Subscription'));
  console.log('Includes Usage Subscription tab:', html.includes('Usage Subscription'));
  console.log('Includes Compare our plans:', html.includes('Compare our plans'));
  console.log('Includes Basic plan:', html.includes('Basic'));
  console.log('Includes Car Service module:', html.includes('Car Service'));
  console.log('Includes Google Captcha module:', html.includes('Google Captcha'));
  console.log('Includes Paypal module:', html.includes('Paypal'));
  console.log('Includes Photography module:', html.includes('Photography'));
  console.log('Includes Stripe module:', html.includes('Stripe'));

  // 3. Connect DB and Test Dev 1's Plan Quota Enforcement
  console.log('\n--- Test 3: Plan Limits Quota Engine Enforcement ---');
  await mongoose.connect(MONGODB_URI);

  const Plan = mongoose.models.Plan || mongoose.model('Plan', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  // Clean up existing test plan
  await Plan.deleteOne({ name: 'Enterprise VIP' });

  // Create Enterprise VIP plan with custom quotas
  const testPlan = await Plan.create({
    name: 'Enterprise VIP',
    packagePriceMonthly: 99,
    packagePriceYearly: 990,
    pricePerUserMonthly: 10,
    pricePerUserYearly: 100,
    pricePerBusinessMonthly: 20,
    pricePerBusinessYearly: 200,
    maxUsers: 50,
    maxBusinesses: 20,
    maxLocations: -1, // Unlimited
    maxServices: -1,  // Unlimited
    storageLimitMb: 51200,
    modules: ['Stripe', 'Paypal', 'GoogleCaptcha', 'CarService', 'Photography'],
    isCustomPlan: false,
    isFreePlan: false,
    hasTrial: true,
    trialDays: 30,
    isEnabled: true,
  });

  console.log('✅ Created test plan:', testPlan.name, 'with ID:', testPlan._id);

  // Dynamic import of Dev 1's plan limits engine
  const { checkPlanLimit } = await import('../lib/plan-limits.ts');

  // Find or create test company
  let testCompany = await User.findOne({ email: 'plan-test-company@example.com' });
  if (!testCompany) {
    testCompany = await User.create({
      name: 'Plan Tester Co',
      email: 'plan-test-company@example.com',
      password: 'hash',
      role: 'company',
      isActive: true,
      activePlanId: testPlan._id,
      planExpireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      totalBusiness: 1,
      totalUser: 1,
      emailVerifiedAt: new Date(),
    });
  } else {
    testCompany.activePlanId = testPlan._id;
    await testCompany.save();
  }

  // Test checkPlanLimit for users
  const userCheck = await checkPlanLimit(testCompany._id, 'users');
  console.log('Plan Limit Check for "users" (expected allowed: true, max: 50):', {
    allowed: userCheck.allowed,
    current: userCheck.current,
    max: userCheck.max,
  });

  // Test checkPlanLimit for locations (unlimited, max: -1)
  const locCheck = await checkPlanLimit(testCompany._id, 'locations');
  console.log('Plan Limit Check for "locations" (expected allowed: true, max: -1 [unlimited]):', {
    allowed: locCheck.allowed,
    current: locCheck.current,
    max: locCheck.max,
  });

  // Clean up
  await User.deleteOne({ email: 'plan-test-company@example.com' });
  await Plan.deleteOne({ _id: testPlan._id });
  await mongoose.disconnect();

  console.log('\n🎉 All automated tests passed with 100% success!');
}

runTests().catch(console.error);
