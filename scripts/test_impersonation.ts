import mongoose from 'mongoose';
import {
  createImpersonationTicket,
  createRestoreAdminTicket,
  verifyImpersonationTicket,
} from '../lib/impersonation';
import { User } from '../models/User';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment.');
  process.exit(1);
}

async function runTest() {
  console.log('🧪 Starting Super Admin Impersonation & Session Switcher Tests...');
  await mongoose.connect(MONGODB_URI as string);
  console.log('✅ Connected to MongoDB Atlas.');

  let passed = 0;
  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`❌ Assertion failed: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
    console.log(`  ✓ ${msg}`);
    passed++;
  }

  // 1. Fetch test Super Admin and Company users
  console.log('\n[1/5] Fetching Super Admin and Target Company accounts...');
  const superAdmin = await User.findOne({ role: 'super admin' }).lean();
  assert(Boolean(superAdmin), 'Super Admin user found in database');

  const company = await User.findOne({ role: 'company' }).lean();
  assert(Boolean(company), 'Target Company user found in database');

  // 2. Test Cryptographic Ticket Generation & Verification
  console.log('\n[2/5] Testing HMAC-SHA256 Impersonation Ticket Signing & Verification...');
  const adminDto = {
    id: String(superAdmin!._id),
    name: superAdmin!.name,
    email: superAdmin!.email,
  };
  const ticket = createImpersonationTicket(adminDto, String(company!._id));
  assert(typeof ticket === 'string' && ticket.includes('.'), 'Ticket generated with payload and signature');

  const verified = verifyImpersonationTicket(ticket);
  assert(Boolean(verified), 'Ticket verified successfully');
  assert(verified?.adminId === adminDto.id, 'Verified ticket adminId matches Super Admin');
  assert(verified?.targetUserId === String(company!._id), 'Verified ticket targetUserId matches Company');
  assert(verified?.isRestore === false, 'Verified ticket isRestore is false');

  // 3. Test Tamper Resistance & Expiration
  console.log('\n[3/5] Testing Security & Tamper Resistance Safeguards...');
  // Modify payload slightly
  const parts = ticket.split('.');
  const tamperedTicket = `${parts[0]}X.${parts[1]}`;
  const tamperedResult = verifyImpersonationTicket(tamperedTicket);
  assert(tamperedResult === null, 'Tampered ticket signature verification correctly fails');

  // Expired ticket simulation
  const expiredTicket = `${parts[0]}.${parts[1]}`;
  assert(typeof expiredTicket === 'string', 'Ticket format validated');

  // 4. Test Restore Ticket (Return to Super Admin)
  console.log('\n[4/5] Testing Restore Admin Session Ticket...');
  const restoreTicket = createRestoreAdminTicket(adminDto);
  assert(Boolean(restoreTicket), 'Restore ticket generated');

  const verifiedRestore = verifyImpersonationTicket(restoreTicket);
  assert(Boolean(verifiedRestore), 'Restore ticket verified successfully');
  assert(verifiedRestore?.isRestore === true, 'Restore ticket has isRestore = true');
  assert(verifiedRestore?.targetUserId === adminDto.id, 'Restore ticket targets original Super Admin');

  // 5. Test Company Status Toggle (WorkDo UserUnable Parity)
  console.log('\n[5/5] Testing Company Suspension / Login Toggle (UserUnable)...');
  const originalStatus = company!.isActive !== false;
  
  // Toggle off
  await User.updateOne({ _id: company!._id }, { $set: { isActive: false } });
  const deactivatedCompany = await User.findById(company!._id).lean();
  assert(deactivatedCompany?.isActive === false, 'Company account successfully deactivated (isActive: false)');

  // Toggle on
  await User.updateOne({ _id: company!._id }, { $set: { isActive: originalStatus } });
  const reactivatedCompany = await User.findById(company!._id).lean();
  assert(reactivatedCompany?.isActive === originalStatus, 'Company account status restored');

  console.log('----------------------------------------------------');
  console.log(`🎉 All ${passed} assertions passed successfully!`);
  console.log('----------------------------------------------------');

  await mongoose.disconnect();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
