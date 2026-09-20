import { connectToDatabase } from '../lib/db';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { hashPassword } from '../lib/password';
import { verifyUserActiveStatus } from '../lib/user-suspension';
import { Types } from 'mongoose';

async function runSuspensionTests() {
  console.log('--- 🧪 STARTING USER SUSPENSION & LOCKOUT INTEGRATION TESTS [BGO-232] ---');

  await connectToDatabase();
  console.log('✅ Connected to MongoDB Atlas');

  // Unique run identifier for isolation
  const runId = Date.now().toString().slice(-6);
  const testCompanyEmail = `test_company_${runId}@example.com`;
  const testStaffEmail = `test_staff_${runId}@example.com`;
  const testCustomerEmail = `test_customer_${runId}@example.com`;
  const defaultPassword = 'TestPassword123!';
  const hashedPassword = await hashPassword(defaultPassword);

  let companyId: Types.ObjectId;
  let staffId: Types.ObjectId;
  let customerId: Types.ObjectId;
  let businessId: Types.ObjectId;

  try {
    // ----------------------------------------------------
    // PHASE 1: Seed Test Fixtures
    // ----------------------------------------------------
    console.log('\n[Phase 1] Provisioning Test Company, Staff & Customer fixtures...');

    const companyUser = await User.create({
      name: `Suspension Test Company ${runId}`,
      email: testCompanyEmail,
      password: hashedPassword,
      role: 'company',
      isActive: true,
      isEnableLogin: true,
      tokenVersion: 0,
      totalBusiness: 1,
      totalUser: 2,
    });
    companyId = companyUser._id as Types.ObjectId;

    const testBusiness = await Business.create({
      companyId: companyUser._id,
      name: `Test Business ${runId}`,
      slug: `test-business-${runId}`,
      currency: 'USD',
      currencySymbol: '$',
      formType: 'form-layout',
      layout: 'Formlayout1',
      themeColor: 'color1-Formlayout1',
      appointmentPrefix: '#APP',
      maximumSlot: 1,
      appointmentReminderHours: 24,
    });
    businessId = testBusiness._id as Types.ObjectId;

    companyUser.activeBusinessId = businessId;
    await companyUser.save();

    const staffUser = await User.create({
      name: `Suspension Test Staff ${runId}`,
      email: testStaffEmail,
      password: hashedPassword,
      role: 'staff',
      companyId: companyUser._id,
      activeBusinessId: businessId,
      isActive: true,
      isEnableLogin: true,
      tokenVersion: 0,
    });
    staffId = staffUser._id as Types.ObjectId;

    const customerUser = await User.create({
      name: `Suspension Test Customer ${runId}`,
      email: testCustomerEmail,
      password: hashedPassword,
      role: 'customer',
      companyId: companyUser._id,
      isActive: true,
      isEnableLogin: true,
      tokenVersion: 0,
    });
    customerId = customerUser._id as Types.ObjectId;

    console.log('✅ Created test users: Company, Staff, Customer');

    // ----------------------------------------------------
    // PHASE 2: Verify Initial Active Status
    // ----------------------------------------------------
    console.log('\n[Phase 2] Verifying initial active status and guard checks...');

    const initialCompanyCheck = await verifyUserActiveStatus(String(companyId), 0);
    const initialStaffCheck = await verifyUserActiveStatus(String(staffId), 0);
    const initialCustomerCheck = await verifyUserActiveStatus(String(customerId), 0);

    if (!initialCompanyCheck || !initialStaffCheck || !initialCustomerCheck) {
      throw new Error('Initial active status check failed!');
    }
    console.log('✅ All test users confirmed active with tokenVersion 0');

    // ----------------------------------------------------
    // PHASE 3: Login Disablement (WorkDo is_enable_login Parity)
    // ----------------------------------------------------
    console.log('\n[Phase 3] Testing toggle login access (isEnableLogin toggle & tokenVersion increment)...');

    // Simulate disabling staff login access
    const staffDoc = await User.findById(staffId);
    if (!staffDoc) throw new Error('Staff not found');

    staffDoc.isEnableLogin = false;
    staffDoc.tokenVersion = (staffDoc.tokenVersion || 0) + 1; // Atomic token increment
    await staffDoc.save();

    const disabledStaffCheck = await verifyUserActiveStatus(String(staffId), 0);
    if (disabledStaffCheck !== false) {
      throw new Error('Staff with isEnableLogin=false should be blocked by guard check!');
    }
    console.log('✅ Disabled staff access is correctly rejected by verifyUserActiveStatus (isEnableLogin check)');

    // Re-enable staff login
    staffDoc.isEnableLogin = true;
    await staffDoc.save();

    const reenabledStaffCheck = await verifyUserActiveStatus(String(staffId), staffDoc.tokenVersion);
    if (reenabledStaffCheck !== true) {
      throw new Error('Staff with isEnableLogin=true should be permitted!');
    }
    console.log('✅ Re-enabled staff access is correctly permitted');

    // ----------------------------------------------------
    // PHASE 4: Full User Account Suspension & Token Revocation
    // ----------------------------------------------------
    console.log('\n[Phase 4] Testing full user account suspension & instant token revocation...');

    const customerDoc = await User.findById(customerId);
    if (!customerDoc) throw new Error('Customer not found');

    const originalTokenVersion = customerDoc.tokenVersion || 0;

    // Suspend customer
    customerDoc.isActive = false;
    customerDoc.isEnableLogin = false;
    customerDoc.suspendedReason = 'Chargeback abuse and repeated cancellations.';
    customerDoc.suspendedAt = new Date();
    customerDoc.tokenVersion = originalTokenVersion + 1;
    await customerDoc.save();

    // Verify in Atlas
    const reloadedCustomer = await User.findById(customerId).lean();
    if (
      reloadedCustomer?.isActive !== false ||
      reloadedCustomer?.isEnableLogin !== false ||
      reloadedCustomer?.tokenVersion !== 1 ||
      reloadedCustomer?.suspendedReason !== 'Chargeback abuse and repeated cancellations.' ||
      !reloadedCustomer?.suspendedAt
    ) {
      throw new Error('Customer suspension fields were not properly persisted in Atlas!');
    }
    console.log('✅ Suspension fields correctly persisted in Atlas with tokenVersion incremented');

    // Check with old token version (simulates existing active JWT)
    const oldTokenCheck = await verifyUserActiveStatus(String(customerId), originalTokenVersion);
    if (oldTokenCheck !== false) {
      throw new Error('Old active JWT token was NOT revoked after suspension!');
    }
    console.log('✅ Old JWT token with stale tokenVersion is immediately rejected');

    // ----------------------------------------------------
    // PHASE 5: Parent Company Suspension Cascade
    // ----------------------------------------------------
    console.log('\n[Phase 5] Testing parent company suspension cascade for staff/customers...');

    // Suspend parent company
    const compDoc = await User.findById(companyId);
    if (!compDoc) throw new Error('Company not found');
    compDoc.isActive = false;
    compDoc.isEnableLogin = false;
    compDoc.tokenVersion = (compDoc.tokenVersion || 0) + 1;
    await compDoc.save();

    // Now test staff access (even though staff's own isEnableLogin is true)
    const cascadeStaffCheck = await verifyUserActiveStatus(String(staffId), staffDoc.tokenVersion);
    if (cascadeStaffCheck !== false) {
      throw new Error('Staff login should be blocked when parent company is suspended!');
    }
    console.log('✅ Staff member access is blocked when parent company is suspended (Cascade parity)');

    // ----------------------------------------------------
    // PHASE 6: Reactivation Verification
    // ----------------------------------------------------
    console.log('\n[Phase 6] Testing reactivation workflow...');

    // Reactivate company
    compDoc.isActive = true;
    compDoc.isEnableLogin = true;
    await compDoc.save();

    // Reactivate customer
    const custToReactivate = await User.findById(customerId);
    if (!custToReactivate) throw new Error('Customer not found');
    custToReactivate.isActive = true;
    custToReactivate.isEnableLogin = true;
    custToReactivate.suspendedReason = undefined;
    custToReactivate.suspendedAt = undefined;
    await custToReactivate.save();

    const reactivatedCustomerCheck = await verifyUserActiveStatus(
      String(customerId),
      custToReactivate.tokenVersion
    );
    const reactivatedStaffCheck = await verifyUserActiveStatus(
      String(staffId),
      staffDoc.tokenVersion
    );

    if (!reactivatedCustomerCheck || !reactivatedStaffCheck) {
      throw new Error('Reactivated users should have access restored!');
    }
    console.log('✅ Access successfully restored after reactivation');

    console.log('\n🎉 ALL 18 ASSERTIONS PASSED WITH ZERO ERRORS! [BGO-232 VERIFIED]');
  } finally {
    // Cleanup fixtures
    console.log('\n[Cleanup] Cleaning up test fixtures...');
    if (companyId!) await User.deleteOne({ _id: companyId });
    if (staffId!) await User.deleteOne({ _id: staffId });
    if (customerId!) await User.deleteOne({ _id: customerId });
    if (businessId!) await Business.deleteOne({ _id: businessId });
    console.log('✅ Test fixtures cleaned up successfully');
  }
}

runSuspensionTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
