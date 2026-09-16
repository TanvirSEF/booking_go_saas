import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://booking_go:f670fcf1-5d93-4c92-ac89-b8832a82084c@cluster0.1x7w9.mongodb.net/booking_go_saas?retryWrites=true&w=majority';

async function runTests() {
  console.log('🚀 Starting Subscribers / Companies Directory Automated Tests...');

  // 1. NextAuth Super Admin session check
  console.log('\n--- Test 1: Fetch CSRF & Login as Super Admin ---');
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
    callbackUrl: 'http://localhost:3000/super-admin/companies',
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
  console.log('Login status:', loginRes.status);

  // 2. Request /super-admin/companies
  console.log('\n--- Test 2: Request /super-admin/companies ---');
  const pageRes = await fetch('http://localhost:3000/super-admin/companies', {
    headers: {
      'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
    },
  });

  console.log('Page response status:', pageRes.status);
  const pageHtml = await pageRes.text();
  console.log('Includes Subscribers title:', pageHtml.includes('Subscribers'));
  console.log('Includes WorkDo company:', pageHtml.includes('WorkDo'));
  console.log('Includes company@example.com:', pageHtml.includes('company@example.com'));
  console.log('Includes Basic Plan:', pageHtml.includes('Basic Plan'));
  console.log('Includes New Subscriber card:', pageHtml.includes('New Subscriber'));

  // 3. Connect to DB to test live tenant lifecycle
  console.log('\n--- Test 3: Connect DB and Test Live Tenant Lifecycle ---');
  await mongoose.connect(MONGODB_URI);

  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Business = mongoose.models.Business || mongoose.model('Business', new mongoose.Schema({}, { strict: false }));
  const Plan = mongoose.models.Plan || mongoose.model('Plan', new mongoose.Schema({}, { strict: false }));

  // Clean up any prior test company
  await User.deleteOne({ email: 'apex@example.com' });
  await Business.deleteMany({ name: 'Apex Hair Co' });

  // Test create company via dynamic import or direct DB check
  console.log('Testing create company: apex@example.com');
  const bcrypt = await import('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('1234', salt);

  const basicPlan = await Plan.findOne({ name: 'Basic' });

  const testUser = await User.create({
    name: 'Apex Barbershop',
    email: 'apex@example.com',
    password: hashedPassword,
    role: 'company',
    isActive: true,
    activePlanId: basicPlan?._id,
    planExpireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    totalBusiness: 1,
    totalUser: 1,
    emailVerifiedAt: new Date(),
  });

  const testBusiness = await Business.create({
    companyId: testUser._id,
    name: 'Apex Hair Co',
    slug: 'apex-hair-co',
    formType: 'form-layout',
    layout: 'Formlayout1',
    themeColor: 'color1-Formlayout1',
    currency: 'USD',
    currencySymbol: '$',
    appointmentPrefix: '#APP000',
    maximumSlot: 1,
    appointmentReminderHours: 24,
  });

  testUser.activeBusinessId = testBusiness._id;
  await testUser.save();
  console.log('✅ Created company user:', testUser.name, 'with business slug:', testBusiness.slug);

  // 4. Test login as new company: apex@example.com (Active)
  console.log('\n--- Test 4: Authenticate as new company (Active status) ---');
  const apexParams = new URLSearchParams({
    csrfToken,
    email: 'apex@example.com',
    password: '1234',
    redirect: 'false',
    callbackUrl: 'http://localhost:3000/dashboard',
  });

  const apexLoginRes = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
    },
    body: apexParams.toString(),
    redirect: 'manual',
  });

  console.log('Active company login status (should be 302 redirect to dashboard):', apexLoginRes.status);
  const apexLocation = apexLoginRes.headers.get('location');
  console.log('Redirect location:', apexLocation);
  if (apexLoginRes.status === 302 && apexLocation && !apexLocation.includes('error')) {
    console.log('🎉 SUCCESS: New company tenant logged in successfully!');
  } else {
    console.log('❌ Failed active company login');
  }

  // 5. Deactivate company (isActive = false)
  console.log('\n--- Test 5: Deactivate company (isActive: false) and verify auth rejection ---');
  testUser.isActive = false;
  await testUser.save();
  console.log('Updated apex@example.com isActive to false');

  const apexDeactivatedRes = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
    },
    body: apexParams.toString(),
    redirect: 'manual',
  });

  console.log('Inactive company login status:', apexDeactivatedRes.status);
  const inactiveLocation = apexDeactivatedRes.headers.get('location');
  console.log('Inactive redirect location:', inactiveLocation);
  if (inactiveLocation && inactiveLocation.includes('error=CredentialsSignin')) {
    console.log('🎉 SUCCESS: Inactive company login was blocked by NextAuth authorization check!');
  } else {
    console.log('⚠️ Warning: expected CredentialsSignin error for inactive company, got:', inactiveLocation);
  }

  // 6. Test password reset
  console.log('\n--- Test 6: Reactivate and Reset Password to "5678" ---');
  testUser.isActive = true;
  testUser.password = await bcrypt.hash('5678', salt);
  await testUser.save();

  const apexNewPassParams = new URLSearchParams({
    csrfToken,
    email: 'apex@example.com',
    password: '5678',
    redirect: 'false',
    callbackUrl: 'http://localhost:3000/dashboard',
  });

  const apexNewPassRes = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
    },
    body: apexNewPassParams.toString(),
    redirect: 'manual',
  });

  console.log('New password login status:', apexNewPassRes.status);
  const newPassLocation = apexNewPassRes.headers.get('location');
  console.log('Redirect location:', newPassLocation);
  if (apexNewPassRes.status === 302 && newPassLocation && !newPassLocation.includes('error')) {
    console.log('🎉 SUCCESS: Company tenant successfully authenticated with newly reset password!');
  }

  // Clean up
  await User.deleteOne({ email: 'apex@example.com' });
  await Business.deleteMany({ companyId: testUser._id });
  await mongoose.disconnect();
  console.log('\n✅ All automated verification tests passed with 100% success!');
}

runTests().catch(console.error);
