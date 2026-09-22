import mongoose, { Types } from 'mongoose';
import { NextRequest } from 'next/server';
import { connectToDatabase } from '../lib/db';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { Location } from '../models/Location';
import { Category } from '../models/Category';
import { Service } from '../models/Service';
import { Staff } from '../models/Staff';
import { Customer } from '../models/Customer';
import { Appointment } from '../models/Appointment';
import { AppointmentPayment } from '../models/AppointmentPayment';
import { CustomStatus } from '../models/CustomStatus';
import { hashPassword } from '../lib/password';
import { signApiToken, decodeAndVerifyToken } from '../lib/api-auth';

// Import Route Handlers
import { POST as loginRoute } from '../app/api/v1/auth/login/route';
import { POST as passwordRoute } from '../app/api/v1/auth/password/route';
import { GET as dashboardRoute } from '../app/api/v1/dashboard/route';
import {
  GET as businessesGetRoute,
  PATCH as businessesPatchRoute,
  DELETE as businessesDeleteRoute,
} from '../app/api/v1/businesses/route';
import { POST as activeBusinessRoute } from '../app/api/v1/businesses/active/route';
import {
  GET as servicesGetRoute,
  POST as servicesPostRoute,
  PUT as servicesPutRoute,
  DELETE as servicesDeleteRoute,
} from '../app/api/v1/services/route';
import {
  GET as appointmentsGetRoute,
  DELETE as appointmentsDeleteRoute,
} from '../app/api/v1/appointments/route';
import { PATCH as appointmentStatusRoute } from '../app/api/v1/appointments/status/route';
import { GET as calendarGetRoute } from '../app/api/v1/appointments/calendar/route';
import {
  GET as customStatusGetRoute,
  POST as customStatusPostRoute,
  PUT as customStatusPutRoute,
  DELETE as customStatusDeleteRoute,
} from '../app/api/v1/custom-statuses/route';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  \x1b[32m✔\x1b[0m ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖\x1b[0m ${message}`);
    failed++;
  }
}

async function runMobileRestApiSuite() {
  console.log('\n===============================================================');
  console.log(' Priority 31 [BGO-249]: Headless & Mobile REST API v1 Test');
  console.log('===============================================================\n');

  await connectToDatabase();

  const testSuffix = Date.now().toString().slice(-6);

  // Tenant A Fixture IDs
  const companyUserIdA = new Types.ObjectId();
  const businessIdA1 = new Types.ObjectId();
  const businessIdA2 = new Types.ObjectId();
  const locationIdA = new Types.ObjectId();
  const categoryIdA = new Types.ObjectId();
  const serviceIdA = new Types.ObjectId();
  const staffUserIdA = new Types.ObjectId();
  const staffIdA = new Types.ObjectId();
  const customerIdA = new Types.ObjectId();
  const appointmentIdA = new Types.ObjectId();
  const paymentIdA = new Types.ObjectId();
  const customStatusIdA = new Types.ObjectId();

  // Tenant B Fixture IDs
  const companyUserIdB = new Types.ObjectId();
  const businessIdB = new Types.ObjectId();

  const defaultPasswordPlain = 'Secret123!';
  let tenantTokenA = '';
  let tenantTokenB = '';

  try {
    console.log('--- Setting up Atlas Fixtures ---');

    const hashedPassword = await hashPassword(defaultPasswordPlain);

    // 1. Tenant A User & Businesses
    await User.create({
      _id: companyUserIdA,
      name: `Tenant A Company ${testSuffix}`,
      email: `tenant_a_${testSuffix}@restapi.test`,
      password: hashedPassword,
      role: 'company',
      activeBusinessId: businessIdA1,
      isActive: true,
    });

    await Business.create({
      _id: businessIdA1,
      companyId: companyUserIdA,
      name: `Health Clinic Alpha ${testSuffix}`,
      slug: `health-alpha-${testSuffix}`,
    });

    await Business.create({
      _id: businessIdA2,
      companyId: companyUserIdA,
      name: `Dental Spa Alpha ${testSuffix}`,
      slug: `dental-alpha-${testSuffix}`,
    });

    // 2. Tenant B User & Business (Isolation test)
    await User.create({
      _id: companyUserIdB,
      name: `Tenant B Company ${testSuffix}`,
      email: `tenant_b_${testSuffix}@restapi.test`,
      password: hashedPassword,
      role: 'company',
      activeBusinessId: businessIdB,
      isActive: true,
    });

    await Business.create({
      _id: businessIdB,
      companyId: companyUserIdB,
      name: `Barber Shop Beta ${testSuffix}`,
      slug: `barber-beta-${testSuffix}`,
    });

    // 3. Location, Category, Service, Staff, Customer for Tenant A
    await Location.create({
      _id: locationIdA,
      companyId: companyUserIdA,
      businessId: businessIdA1,
      name: `Downtown Clinic ${testSuffix}`,
      address: '500 Grand Ave',
      phone: '+15551234',
    });

    await Category.create({
      _id: categoryIdA,
      companyId: companyUserIdA,
      businessId: businessIdA1,
      name: `Therapies ${testSuffix}`,
    });

    await Service.create({
      _id: serviceIdA,
      companyId: companyUserIdA,
      businessId: businessIdA1,
      categoryId: categoryIdA,
      name: `Physiotherapy Session ${testSuffix}`,
      price: 120,
      durationMinutes: 45,
      isActive: true,
    });

    await User.create({
      _id: staffUserIdA,
      name: `Dr. Gregory ${testSuffix}`,
      email: `dr_gregory_${testSuffix}@restapi.test`,
      role: 'staff',
      companyId: companyUserIdA,
    });

    await Staff.create({
      _id: staffIdA,
      companyId: companyUserIdA,
      businessId: businessIdA1,
      userId: staffUserIdA,
      name: `Dr. Gregory ${testSuffix}`,
      locationIds: [locationIdA],
      serviceIds: [serviceIdA],
    });

    await Customer.create({
      _id: customerIdA,
      companyId: companyUserIdA,
      businessId: businessIdA1,
      name: `John Doe ${testSuffix}`,
      email: `john_doe_${testSuffix}@restapi.test`,
      contact: '+15558888',
    });

    await Appointment.create({
      _id: appointmentIdA,
      appointmentNumber: `APT-REST-${testSuffix}`,
      companyId: companyUserIdA,
      businessId: businessIdA1,
      locationId: locationIdA,
      serviceId: serviceIdA,
      staffId: staffIdA,
      customerId: customerIdA,
      customerType: 'existing-user',
      name: `John Doe ${testSuffix}`,
      email: `john_doe_${testSuffix}@restapi.test`,
      contact: '+15558888',
      date: '2026-10-20',
      time: '11:00-11:45',
      durationMinutes: 45,
      price: 120,
      paymentType: 'Card',
      paymentStatus: 'paid',
      appointmentStatus: 'Confirmed',
      statusColor: '#21c9b0',
    });

    await AppointmentPayment.create({
      _id: paymentIdA,
      companyId: companyUserIdA,
      businessId: businessIdA1,
      appointmentId: appointmentIdA,
      paymentType: 'Card',
      amount: 120,
      discountAmount: 0,
      finalAmount: 120,
      paymentDate: new Date(),
      txnId: `txn_api_${testSuffix}`,
      status: 'completed',
    });

    await CustomStatus.create({
      _id: customStatusIdA,
      companyId: companyUserIdA,
      businessId: businessIdA1,
      title: `Checked-In ${testSuffix}`,
      statusColor: '#27a93d',
      icon: 'ti-shield-check',
      order: 1,
    });

    console.log('Fixtures provisioned successfully.\n');

    // -------------------------------------------------------------------------
    // Test Section 1: JWT Token Generation & Verification Unit
    // -------------------------------------------------------------------------
    console.log('--- Test Section 1: JWT Token Generation & Cryptographic Verification ---');
    const sampleToken = signApiToken({
      userId: String(companyUserIdA),
      email: `tenant_a_${testSuffix}@restapi.test`,
      role: 'company',
      activeBusinessId: String(businessIdA1),
    });

    assert(typeof sampleToken === 'string' && sampleToken.split('.').length === 3, 'Generated 3-part signed JWT token');

    const decoded = decodeAndVerifyToken(sampleToken);
    assert(decoded.userId === String(companyUserIdA), 'Decoded token matches userId');
    assert(decoded.email === `tenant_a_${testSuffix}@restapi.test`, 'Decoded token matches email');
    assert(decoded.activeBusinessId === String(businessIdA1), 'Decoded token matches activeBusinessId');

    let tamperErrorCaught = false;
    try {
      const tampered = sampleToken.slice(0, -4) + 'abcd';
      decodeAndVerifyToken(tampered);
    } catch {
      tamperErrorCaught = true;
    }
    assert(tamperErrorCaught, 'Cryptographic signature verification rejects tampered token');

    // -------------------------------------------------------------------------
    // Test Section 2: POST /api/v1/auth/login Endpoint
    // -------------------------------------------------------------------------
    console.log('\n--- Test Section 2: POST /api/v1/auth/login Endpoint ---');
    const validLoginReq = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: `tenant_a_${testSuffix}@restapi.test`,
        password: defaultPasswordPlain,
      }),
    });

    const loginRes = await loginRoute(validLoginReq);
    const loginJson = await loginRes.json();

    assert(loginRes.status === 200, `Login status 200 (got ${loginRes.status})`);
    assert(loginJson.status === 'success', 'Login returns status "success"');
    assert(Boolean(loginJson.data?.token), 'Login returns Bearer token');
    assert(loginJson.data?.token_type === 'Bearer', 'token_type is "Bearer"');
    assert(loginJson.data?.active_business === String(businessIdA1), 'Returns correct active_business ID');

    tenantTokenA = loginJson.data?.token;

    // Login for Tenant B
    const loginBReq = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: `tenant_b_${testSuffix}@restapi.test`,
        password: defaultPasswordPlain,
      }),
    });
    const loginBRes = await loginRoute(loginBReq);
    const loginBJson = await loginBRes.json();
    tenantTokenB = loginBJson.data?.token;

    // Staff Login & Password Route Test
    const staffLoginReq = new NextRequest('http://localhost:3000/api/v1/auth/password', {
      method: 'POST',
      headers: { authorization: `Bearer ${tenantTokenA}` },
      body: JSON.stringify({
        current_password: defaultPasswordPlain,
        new_password: 'NewTenantPassword2026!',
      }),
    });
    const staffPassRes = await passwordRoute(staffLoginReq);
    assert(staffPassRes.status === 200, 'POST /auth/password updates password (status 200)');

    // Bad password check
    const badLoginReq = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: `tenant_a_${testSuffix}@restapi.test`,
        password: 'WrongPassword999',
      }),
    });
    const badLoginRes = await loginRoute(badLoginReq);
    assert(badLoginRes.status === 401, 'Bad password returns status 401');

    // -------------------------------------------------------------------------
    // Test Section 3: Bearer Authorization Middleware Guard
    // -------------------------------------------------------------------------
    console.log('\n--- Test Section 3: Bearer Authorization Middleware Guard ---');
    const noAuthReq = new NextRequest('http://localhost:3000/api/v1/dashboard');
    const noAuthRes = await dashboardRoute(noAuthReq);
    assert(noAuthRes.status === 401, 'Unauthenticated request returns status 401');

    const badBearerReq = new NextRequest('http://localhost:3000/api/v1/dashboard', {
      headers: { authorization: 'Bearer invalid.token.payload' },
    });
    const badBearerRes = await dashboardRoute(badBearerReq);
    assert(badBearerRes.status === 401, 'Invalid Bearer token returns status 401');

    // -------------------------------------------------------------------------
    // Test Section 4: GET /api/v1/dashboard Endpoint
    // -------------------------------------------------------------------------
    console.log('\n--- Test Section 4: GET /api/v1/dashboard Endpoint ---');
    const dashReq = new NextRequest('http://localhost:3000/api/v1/dashboard', {
      headers: { authorization: `Bearer ${tenantTokenA}` },
    });

    const dashRes = await dashboardRoute(dashReq);
    const dashJson = await dashRes.json();

    assert(dashRes.status === 200, `Dashboard status 200 (got ${dashRes.status})`);
    assert(dashJson.status === 'success', 'Dashboard response status "success"');
    assert(dashJson.data?.total_business === 2, `Reported 2 businesses (got ${dashJson.data?.total_business})`);
    assert(dashJson.data?.total_appointment >= 1, `Reported appointments count >= 1`);
    assert(Boolean(dashJson.data?.total_revenue), `Reported revenue: ${dashJson.data?.total_revenue}`);
    assert(Array.isArray(dashJson.data?.appointmentChart) && dashJson.data.appointmentChart.length === 7, '7-day appointment chart returned');
    assert(Array.isArray(dashJson.data?.product) && dashJson.data.product.length >= 1, 'Latest services array populated');
    assert(Array.isArray(dashJson.data?.appointment) && dashJson.data.appointment.length >= 1, 'Latest appointments array populated');

    // -------------------------------------------------------------------------
    // Test Section 5: GET, PATCH & Switch /api/v1/businesses
    // -------------------------------------------------------------------------
    console.log('\n--- Test Section 5: Business Management & Switch Endpoints ---');
    const bizReq = new NextRequest('http://localhost:3000/api/v1/businesses', {
      headers: { authorization: `Bearer ${tenantTokenA}` },
    });
    const bizRes = await businessesGetRoute(bizReq);
    const bizJson = await bizRes.json();

    assert(bizRes.status === 200, 'GET /businesses returns 200');
    assert(Array.isArray(bizJson.data) && bizJson.data.length === 2, 'Listed 2 tenant businesses');

    // Switch active business to businessIdA2
    const switchReq = new NextRequest('http://localhost:3000/api/v1/businesses/active', {
      method: 'POST',
      headers: { authorization: `Bearer ${tenantTokenA}` },
      body: JSON.stringify({ business_id: String(businessIdA2) }),
    });
    const switchRes = await activeBusinessRoute(switchReq);
    const switchJson = await switchRes.json();

    assert(switchRes.status === 200, 'POST /businesses/active returns 200');
    assert(switchJson.data?.active_business === String(businessIdA2), 'Switched active business to businessIdA2');

    // Business update via PATCH
    const bPatchReq = new NextRequest('http://localhost:3000/api/v1/businesses', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${tenantTokenA}` },
      body: JSON.stringify({
        name: 'Alpha Spa Updated',
      }),
    });
    const bPatchRes = await businessesPatchRoute(bPatchReq);
    assert(bPatchRes.status === 200, 'PATCH /businesses returns 200');

    // Business delete via DELETE (create temp business to test DELETE safely)
    const tempBiz = await Business.create({
      companyId: companyUserIdA,
      name: `Temp Clinic ${testSuffix}`,
      slug: `temp-clinic-${testSuffix}`,
    });
    const tempBizToken = signApiToken({
      userId: String(companyUserIdA),
      email: `tenant_a_${testSuffix}@restapi.test`,
      role: 'company',
      activeBusinessId: String(tempBiz._id),
    });
    const bDelReq = new NextRequest('http://localhost:3000/api/v1/businesses', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${tempBizToken}` },
    });
    const bDelRes = await businessesDeleteRoute(bDelReq);
    assert(bDelRes.status === 200, 'DELETE /businesses returns 200 and switches to fallback');

    // -------------------------------------------------------------------------
    // Test Section 6: Services CRUD (/api/v1/services)
    // -------------------------------------------------------------------------
    console.log('\n--- Test Section 6: Services CRUD (/api/v1/services) ---');
    const svcGetReq = new NextRequest('http://localhost:3000/api/v1/services', {
      headers: { authorization: `Bearer ${tenantTokenA}` },
    });
    const svcGetRes = await servicesGetRoute(svcGetReq);
    const svcGetJson = await svcGetRes.json();

    assert(svcGetRes.status === 200, 'GET /services returns 200');
    assert(Array.isArray(svcGetJson.data?.category_list), 'Returns category dropdown list');
    assert(Array.isArray(svcGetJson.data?.service_list) && svcGetJson.data.service_list.length >= 1, 'Returns paginated services');

    // Create new service via POST
    const createSvcReq = new NextRequest('http://localhost:3000/api/v1/services', {
      method: 'POST',
      headers: { authorization: `Bearer ${tenantTokenA}` },
      body: JSON.stringify({
        name: `Acupuncture ${testSuffix}`,
        category: String(categoryIdA),
        price: 85,
        duration: 30,
        description: 'Traditional needle therapy',
      }),
    });
    const createSvcRes = await servicesPostRoute(createSvcReq);
    const createSvcJson = await createSvcRes.json();

    assert(createSvcRes.status === 200, 'POST /services returns 200');
    assert(Boolean(createSvcJson.data?.id), 'Created service returns ID');
    const newServiceId = createSvcJson.data?.id;

    // Update service via PUT
    const updateSvcReq = new NextRequest('http://localhost:3000/api/v1/services', {
      method: 'PUT',
      headers: { authorization: `Bearer ${tenantTokenA}` },
      body: JSON.stringify({
        id: newServiceId,
        name: `Acupuncture Advanced ${testSuffix}`,
        price: 95,
      }),
    });
    const updateSvcRes = await servicesPutRoute(updateSvcReq);
    assert(updateSvcRes.status === 200, 'PUT /services returns 200');

    // Delete service via DELETE
    const delSvcReq = new NextRequest(`http://localhost:3000/api/v1/services?id=${newServiceId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${tenantTokenA}` },
    });
    const delSvcRes = await servicesDeleteRoute(delSvcReq);
    assert(delSvcRes.status === 200, 'DELETE /services returns 200');

    // -------------------------------------------------------------------------
    // Test Section 7: Appointments & Status Management (/api/v1/appointments)
    // -------------------------------------------------------------------------
    console.log('\n--- Test Section 7: Appointments & Status Management ---');
    const apptGetReq = new NextRequest('http://localhost:3000/api/v1/appointments', {
      headers: { authorization: `Bearer ${tenantTokenA}` },
    });
    const apptGetRes = await appointmentsGetRoute(apptGetReq);
    const apptGetJson = await apptGetRes.json();

    assert(apptGetRes.status === 200, 'GET /appointments returns 200');
    assert(Array.isArray(apptGetJson.data?.appointment_list), 'Returns appointment list');

    // Update appointment status via PATCH
    const statusReq = new NextRequest('http://localhost:3000/api/v1/appointments/status', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${tenantTokenA}` },
      body: JSON.stringify({
        appointment_id: String(appointmentIdA),
        status: 'Completed',
        status_color: '#27a93d',
      }),
    });
    const statusRes = await appointmentStatusRoute(statusReq);
    assert(statusRes.status === 200, 'PATCH /appointments/status returns 200');

    const updatedAppt = await Appointment.findById(appointmentIdA);
    assert(updatedAppt?.appointmentStatus === 'Completed', 'Atlas appointment status updated to Completed');

    // -------------------------------------------------------------------------
    // Test Section 8: Calendar Range Query (/api/v1/appointments/calendar)
    // -------------------------------------------------------------------------
    console.log('\n--- Test Section 8: Calendar Range Query ---');
    const calReq = new NextRequest('http://localhost:3000/api/v1/appointments/calendar?year=2026&month=10', {
      headers: { authorization: `Bearer ${tenantTokenA}` },
    });
    const calRes = await calendarGetRoute(calReq);
    const calJson = await calRes.json();

    assert(calRes.status === 200, 'GET /appointments/calendar returns 200');
    assert(Array.isArray(calJson.data) && calJson.data.length >= 1, 'Calendar list contains appointment');
    assert(Boolean(calJson.data[0]?.from_time), `Parsed from_time: ${calJson.data[0]?.from_time}`);

    // Delete appointment via DELETE (create temp appointment to test DELETE safely)
    const tempAppt = await Appointment.create({
      companyId: companyUserIdA,
      businessId: businessIdA1,
      serviceId: serviceIdA,
      locationId: locationIdA,
      staffId: staffIdA,
      name: 'Temp Patient',
      email: 'temp@test.com',
      contact: '+15559999',
      date: '2026-10-15',
      time: '14:00 - 15:00',
      appointmentNumber: `#APP-TEMP-${testSuffix.slice(0, 4)}`,
    });
    const delApptReq = new NextRequest(`http://localhost:3000/api/v1/appointments?id=${tempAppt._id}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${tenantTokenA}` },
    });
    const delApptRes = await appointmentsDeleteRoute(delApptReq);
    assert(delApptRes.status === 200, 'DELETE /appointments returns 200');

    // -------------------------------------------------------------------------
    // Test Section 9: Custom Statuses CRUD (/api/v1/custom-statuses)
    // -------------------------------------------------------------------------
    console.log('\n--- Test Section 9: Custom Statuses CRUD ---');
    const csGetReq = new NextRequest('http://localhost:3000/api/v1/custom-statuses', {
      headers: { authorization: `Bearer ${tenantTokenA}` },
    });
    const csGetRes = await customStatusGetRoute(csGetReq);
    const csGetJson = await csGetRes.json();

    assert(csGetRes.status === 200, 'GET /custom-statuses returns 200');
    assert(Array.isArray(csGetJson.data) && csGetJson.data.length >= 1, 'Custom status list populated');

    // Create via POST
    const csPostReq = new NextRequest('http://localhost:3000/api/v1/custom-statuses', {
      method: 'POST',
      headers: { authorization: `Bearer ${tenantTokenA}` },
      body: JSON.stringify({
        title: `In Consultation ${testSuffix}`,
        status_color: '#fa9c30',
        icon: 'ti-loader',
      }),
    });
    const csPostRes = await customStatusPostRoute(csPostReq);
    const csPostJson = await csPostRes.json();

    assert(csPostRes.status === 200, 'POST /custom-statuses returns 200');
    assert(Boolean(csPostJson.data?.id), 'Returns created status ID');
    const newCsId = csPostJson.data?.id;

    // Update via PUT
    const csPutReq = new NextRequest('http://localhost:3000/api/v1/custom-statuses', {
      method: 'PUT',
      headers: { authorization: `Bearer ${tenantTokenA}` },
      body: JSON.stringify({
        id: newCsId,
        title: 'In Consultation Urgent',
        status_color: '#e74c3c',
      }),
    });
    const csPutRes = await customStatusPutRoute(csPutReq);
    assert(csPutRes.status === 200, 'PUT /custom-statuses returns 200');

    // Delete via DELETE
    const csDelReq = new NextRequest(`http://localhost:3000/api/v1/custom-statuses?id=${newCsId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${tenantTokenA}` },
    });
    const csDelRes = await customStatusDeleteRoute(csDelReq);
    assert(csDelRes.status === 200, 'DELETE /custom-statuses returns 200');

    // -------------------------------------------------------------------------
    // Test Section 10: Multi-Tenant Boundary Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- Test Section 10: Multi-Tenant Boundary Isolation ---');
    // Tenant B token attempts to access Tenant A's appointment list
    const crossTenantReq = new NextRequest('http://localhost:3000/api/v1/appointments', {
      headers: { authorization: `Bearer ${tenantTokenB}` },
    });
    const crossTenantRes = await appointmentsGetRoute(crossTenantReq);
    const crossTenantJson = await crossTenantRes.json();

    assert(crossTenantRes.status === 200, 'Tenant B query succeeds under own scope');
    assert(crossTenantJson.data?.appointment_list?.length === 0, 'Tenant B cannot see Tenant A appointments (got 0)');

    // Tenant B attempts to switch to Tenant A's business
    const hijackReq = new NextRequest('http://localhost:3000/api/v1/businesses/active', {
      method: 'POST',
      headers: { authorization: `Bearer ${tenantTokenB}` },
      body: JSON.stringify({ business_id: String(businessIdA1) }),
    });
    const hijackRes = await activeBusinessRoute(hijackReq);
    assert(hijackRes.status === 403, 'Cross-tenant business hijack forbidden (status 403)');

  } catch (error) {
    console.error('Fatal error during test execution:', error);
    failed++;
  } finally {
    console.log('\n--- Cleaning up Test Fixtures from Atlas ---');
    await Promise.allSettled([
      User.deleteMany({ _id: { $in: [companyUserIdA, companyUserIdB, staffUserIdA] } }),
      Business.deleteMany({ _id: { $in: [businessIdA1, businessIdA2, businessIdB] } }),
      Location.deleteOne({ _id: locationIdA }),
      Category.deleteOne({ _id: categoryIdA }),
      Service.deleteMany({ _id: serviceIdA }),
      Staff.deleteOne({ _id: staffIdA }),
      Customer.deleteOne({ _id: customerIdA }),
      Appointment.deleteOne({ _id: appointmentIdA }),
      AppointmentPayment.deleteOne({ _id: paymentIdA }),
      CustomStatus.deleteOne({ _id: customStatusIdA }),
    ]);
    console.log('Atlas cleanup finished.');
  }

  console.log('\n===============================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    await mongoose.disconnect();
    process.exit(1);
  }

  await mongoose.disconnect();
  process.exit(0);
}

runMobileRestApiSuite().catch(async (err) => {
  console.error('Unhandled error in test suite:', err);
  await mongoose.disconnect();
  process.exit(1);
});
