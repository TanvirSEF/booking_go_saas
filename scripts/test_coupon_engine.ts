import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db';
import { Coupon } from '../models/Coupon';
import { UserCoupon } from '../models/UserCoupon';
import { User } from '../models/User';
import {
  calculateCouponDiscount,
  validateCouponRules,
  redeemCoupon,
  generateRandomCouponCode,
} from '../lib/coupon-engine';

let passedAssertions = 0;
let totalAssertions = 0;

function assert(condition: unknown, message: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function run() {
  console.log('=====================================================================');
  console.log('🚀 Running Live Atlas Integration Tests: Coupon Rules & Redemption Engine');
  console.log('=====================================================================\n');

  // -------------------------------------------------------------
  // Phase 1: Pure Mathematical Discount Calculations
  // -------------------------------------------------------------
  console.log('👉 Phase 1: Unit Testing Discount Calculation Mathematics');

  // 1a. Percentage calculation (20% off $150 = $30 discount, $120 final)
  const calcPct = calculateCouponDiscount('percentage', 20, 150);
  assert(calcPct.discountAmount === 30, 'Calculates 20% discount correctly ($30.00)');
  assert(calcPct.finalAmount === 120, 'Calculates net amount correctly ($120.00)');
  assert(calcPct.formattedDiscount === '$30.00', 'Formats discount string ($30.00)');
  assert(calcPct.formattedFinalAmount === '$120.00', 'Formats net string ($120.00)');

  // 1b. Flat rate calculation ($25 off $100 = $25 discount, $75 final)
  const calcFlat = calculateCouponDiscount('flat', 25, 100);
  assert(calcFlat.discountAmount === 25, 'Calculates flat discount correctly ($25.00)');
  assert(calcFlat.finalAmount === 75, 'Calculates net amount for flat discount ($75.00)');

  // 1c. Flat rate exceeds order total (capped at order total: $50 off $35 = $35 discount, $0 final)
  const calcCapped = calculateCouponDiscount('flat', 50, 35);
  assert(calcCapped.discountAmount === 35, 'Caps flat discount at order total to prevent negative balance');
  assert(calcCapped.finalAmount === 0, 'Final price is $0.00 when discount exceeds order total');

  // 1d. 100% percentage discount (100% off $80 = $80 discount, $0 final)
  const calcFree = calculateCouponDiscount('percentage', 100, 80);
  assert(calcFree.discountAmount === 80, '100% discount calculates full amount');
  assert(calcFree.finalAmount === 0, '100% discount yields $0.00 final amount');

  // 1e. Random Coupon Code Generator verification
  const generatedCode = generateRandomCouponCode('SUMMER', 4);
  assert(generatedCode.startsWith('SUMMER-'), 'Generated code has expected prefix');
  assert(generatedCode.length === 16, 'Generated code matches standard format length');
  assert(/^[A-Z0-9-]+$/.test(generatedCode), 'Generated code contains only uppercase alphanumeric and hyphens');

  // -------------------------------------------------------------
  // Phase 2: Live Atlas Fixtures Provisioning
  // -------------------------------------------------------------
  console.log('\n👉 Phase 2: Provisioning Test Fixtures in MongoDB Atlas');
  await connectToDatabase();

  const testSuffix = `cpn_${Date.now()}`;

  const userA = await User.create({
    name: 'Coupon Tester Alpha',
    email: `alpha_${testSuffix}@example.com`,
    password: 'Password123!',
    role: 'company',
  });

  const userB = await User.create({
    name: 'Coupon Tester Beta',
    email: `beta_${testSuffix}@example.com`,
    password: 'Password123!',
    role: 'company',
  });

  // Provision test coupons with various rule combinations
  const codePercentage = `PCT20_${testSuffix}`.toUpperCase();
  const couponPct = await Coupon.create({
    name: '20% Off Growth Plan',
    code: codePercentage,
    discountType: 'percentage',
    discount: 20,
    limit: 10,
    usedCount: 0,
    maxUsagePerUser: 2,
    minimumSpend: 50,
    maximumSpend: 500,
    isActive: true,
  });

  const codeFlat = `FLAT15_${testSuffix}`.toUpperCase();
  const couponFlat = await Coupon.create({
    name: '$15 Off Single Use',
    code: codeFlat,
    discountType: 'flat',
    discount: 15,
    limit: 2, // only 2 redemptions globally allowed
    usedCount: 0,
    maxUsagePerUser: 1, // each user can only use once
    minimumSpend: 20,
    isActive: true,
  });

  const codeExpired = `EXPIRED_${testSuffix}`.toUpperCase();
  const couponExpired = await Coupon.create({
    name: 'Expired Promo',
    code: codeExpired,
    discountType: 'percentage',
    discount: 50,
    limit: 100,
    usedCount: 0,
    expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired yesterday
    isActive: true,
  });

  const codeInactive = `INACTIVE_${testSuffix}`.toUpperCase();
  const couponInactive = await Coupon.create({
    name: 'Disabled Promo',
    code: codeInactive,
    discountType: 'flat',
    discount: 10,
    limit: 50,
    usedCount: 0,
    isActive: false, // inactive!
  });

  const codeExhausted = `EXHAUSTED_${testSuffix}`.toUpperCase();
  const couponExhausted = await Coupon.create({
    name: 'Exhausted Promo',
    code: codeExhausted,
    discountType: 'percentage',
    discount: 25,
    limit: 3,
    usedCount: 3, // fully used!
    isActive: true,
  });

  try {
    // -------------------------------------------------------------
    // Phase 3: Rule Validation & Defensive Guards
    // -------------------------------------------------------------
    console.log('\n👉 Phase 3: Testing Coupon Business Rules & Validation Guards');

    // 3a. Empty code
    const emptyCheck = await validateCouponRules('', 100);
    assert(emptyCheck.success === false, 'Rejects empty coupon code');
    assert(emptyCheck.error?.includes('enter a coupon code'), 'Returns descriptive error for empty code');

    // 3b. Non-existent code
    const notFoundCheck = await validateCouponRules('NON_EXISTENT_CODE_XYZ', 100);
    assert(notFoundCheck.success === false, 'Rejects non-existent coupon code');
    assert(notFoundCheck.error?.includes('is invalid'), 'Returns invalid code error');

    // 3c. Inactive coupon
    const inactiveCheck = await validateCouponRules(codeInactive, 100);
    assert(inactiveCheck.success === false, 'Rejects disabled/inactive coupon');
    assert(inactiveCheck.error?.includes('currently inactive'), 'Returns currently inactive error');

    // 3d. Expired coupon
    const expiredCheck = await validateCouponRules(codeExpired, 100);
    assert(expiredCheck.success === false, 'Rejects expired coupon');
    assert(expiredCheck.error?.includes('has expired'), 'Returns expired error message');

    // 3e. Global limit exhaustion
    const exhaustedCheck = await validateCouponRules(codeExhausted, 100);
    assert(exhaustedCheck.success === false, 'Rejects coupon that reached global usage limit');
    assert(exhaustedCheck.error?.includes('maximum usage limit'), 'Returns maximum usage limit error');

    // 3f. Minimum spend restriction
    const belowMinSpendCheck = await validateCouponRules(codePercentage, 40); // minimum is $50
    assert(belowMinSpendCheck.success === false, 'Rejects order below minimum spend threshold ($40 < $50)');
    assert(belowMinSpendCheck.error?.includes('below the minimum spend'), 'Returns minimum spend error');

    const meetMinSpendCheck = await validateCouponRules(codePercentage, 60);
    assert(meetMinSpendCheck.success === true, 'Accepts order meeting minimum spend threshold ($60 >= $50)');
    assert(meetMinSpendCheck.calculation?.discountAmount === 12, 'Calculates 20% discount on $60 correctly ($12.00)');

    // 3g. Maximum spend restriction
    const aboveMaxSpendCheck = await validateCouponRules(codePercentage, 600); // maximum is $500
    assert(aboveMaxSpendCheck.success === false, 'Rejects order exceeding maximum spend ceiling ($600 > $500)');
    assert(aboveMaxSpendCheck.error?.includes('exceeds the maximum spend'), 'Returns maximum spend ceiling error');

    // -------------------------------------------------------------
    // Phase 4: Per-User Usage Limit Enforcement
    // -------------------------------------------------------------
    console.log('\n👉 Phase 4: Testing Per-User Redemption Limits');

    // 4a. User A redeems flat coupon (maxUsagePerUser: 1) for the first time -> MUST PASS
    const redeemResult1 = await redeemCoupon({
      code: codeFlat,
      orderAmount: 50,
      userId: userA._id.toString(),
    });
    assert(redeemResult1.success === true, 'First redemption by User A succeeds');
    assert(Boolean(redeemResult1.userCouponId), 'Creates UserCoupon audit record');
    assert(redeemResult1.calculation?.discountAmount === 15, 'Applies $15.00 flat discount');
    assert(redeemResult1.calculation?.finalAmount === 35, 'Leaves $35.00 net order amount');

    // Verify UserCoupon record in Atlas
    const userCouponRecord = await UserCoupon.findById(redeemResult1.userCouponId).lean();
    assert(Boolean(userCouponRecord), 'UserCoupon found in MongoDB Atlas');
    assert(
      String(userCouponRecord?.userId) === String(userA._id),
      'UserCoupon correctly references User A'
    );

    // Verify Coupon usedCount incremented to 1
    const couponAfter1 = await Coupon.findById(couponFlat._id).lean();
    assert(couponAfter1?.usedCount === 1, 'Coupon usedCount atomically incremented to 1');

    // 4b. User A attempts to validate or redeem same coupon again -> MUST FAIL (per-user limit = 1)
    const userASecondCheck = await validateCouponRules(
      codeFlat,
      50,
      userA._id.toString()
    );
    assert(userASecondCheck.success === false, 'Rejects second attempt by User A exceeding per-user limit');
    assert(
      userASecondCheck.error?.includes('maximum number of times allowed (1)'),
      'Returns per-user limit error message'
    );

    const userASecondRedeem = await redeemCoupon({
      code: codeFlat,
      orderAmount: 50,
      userId: userA._id.toString(),
    });
    assert(userASecondRedeem.success === false, 'Redemption blocked for User A exceeding limit');

    // 4c. User B (distinct user) attempts to redeem flat coupon -> MUST PASS (user B has 0 prior uses)
    const redeemResult2 = await redeemCoupon({
      code: codeFlat,
      orderAmount: 60,
      userId: userB._id.toString(),
    });
    assert(redeemResult2.success === true, 'First redemption by User B succeeds');

    // 4d. Now couponFlat has reached its global limit of 2 (User A = 1, User B = 1)
    const couponAfter2 = await Coupon.findById(couponFlat._id).lean();
    assert(couponAfter2?.usedCount === 2, 'Coupon usedCount is now 2 (at global limit 2)');

    // 4e. A third user attempts to use couponFlat -> MUST FAIL due to global limit
    const thirdUserCheck = await validateCouponRules(codeFlat, 50);
    assert(thirdUserCheck.success === false, 'Rejects new attempt when global limit is exhausted');
    assert(thirdUserCheck.error?.includes('maximum usage limit'), 'Returns global limit error');

    // -------------------------------------------------------------
    // Phase 5: Multi-Redemption on Higher Limit Coupon (couponPct)
    // -------------------------------------------------------------
    console.log('\n👉 Phase 5: Testing Multi-Use User Limit (maxUsagePerUser: 2)');

    // User A redeems couponPct (limit 10, maxUsagePerUser 2)
    const userAUSe1 = await redeemCoupon({
      code: codePercentage,
      orderAmount: 100,
      userId: userA._id.toString(),
    });
    assert(userAUSe1.success === true, 'User A first use of 2-use coupon succeeds');

    const userAUse2 = await redeemCoupon({
      code: codePercentage,
      orderAmount: 200,
      userId: userA._id.toString(),
    });
    assert(userAUse2.success === true, 'User A second use of 2-use coupon succeeds');

    const userAUse3 = await redeemCoupon({
      code: codePercentage,
      orderAmount: 150,
      userId: userA._id.toString(),
    });
    assert(userAUse3.success === false, 'User A third use of 2-use coupon is rejected');
    assert(userAUse3.error?.includes('maximum number of times allowed (2)'), 'Enforces 2-use per-user ceiling');

    // -------------------------------------------------------------
    // Phase 6: Super Admin Coupon Status Management & Cascading
    // -------------------------------------------------------------
    console.log('\n👉 Phase 6: Super Admin Management & Audit Cascading');

    // Toggle active status
    couponPct.isActive = false;
    await couponPct.save();

    const disabledCheck = await validateCouponRules(codePercentage, 100);
    assert(disabledCheck.success === false, 'Toggling coupon status to inactive prevents further redemptions');

    couponPct.isActive = true;
    await couponPct.save();

    const reenabledCheck = await validateCouponRules(codePercentage, 100, userB._id.toString());
    assert(reenabledCheck.success === true, 'Re-enabling coupon restores checkout availability');

    // Total audit log check
    const totalUserCoupons = await UserCoupon.countDocuments({
      couponId: couponFlat._id,
    });
    assert(totalUserCoupons === 2, 'UserCoupon audit log accurately records all 2 redemptions');

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n=====================================================================');
    console.log(`🎉 All Coupon Engine Tests Passed: ${passedAssertions}/${totalAssertions} Assertions!`);
    console.log('=====================================================================\n');
  } finally {
    // Clean up test documents
    await UserCoupon.deleteMany({
      couponId: {
        $in: [
          couponPct._id,
          couponFlat._id,
          couponExpired._id,
          couponInactive._id,
          couponExhausted._id,
        ],
      },
    });
    await Coupon.deleteMany({
      _id: {
        $in: [
          couponPct._id,
          couponFlat._id,
          couponExpired._id,
          couponInactive._id,
          couponExhausted._id,
        ],
      },
    });
    await User.findByIdAndDelete(userA._id);
    await User.findByIdAndDelete(userB._id);
    await mongoose.disconnect();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });
