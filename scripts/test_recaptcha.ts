import { connectToDatabase } from '../lib/db';
import { SystemSetting } from '../models/SystemSetting';
import {
  getRecaptchaConfig,
  isRecaptchaEnabled,
  verifyRecaptchaToken,
} from '../lib/recaptcha';
import { getPublicRecaptchaConfigAction, verifyRecaptchaTokenAction } from '../actions/recaptcha';
import { registerCompanyAction } from '../actions/auth';
import { Business } from '../models/Business';
import { User } from '../models/User';

async function runRecaptchaTests() {
  console.log('--- 🧪 STARTING GOOGLE RECAPTCHA VERIFICATION ENGINE TESTS [BGO-233] ---');

  await connectToDatabase();
  console.log('✅ Connected to MongoDB Atlas');

  let passed = 0;
  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`❌ Assertion failed: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
    console.log(`  ✓ ${msg}`);
    passed++;
  }

  // Backup existing settings
  const originalSettings = await SystemSetting.find({ group: 'recaptcha' }).lean();

  try {
    // ----------------------------------------------------
    // PHASE 1: Configuration Retrieval & Mapping
    // ----------------------------------------------------
    console.log('\n[Phase 1] Testing reCAPTCHA configuration retrieval...');
    const config = await getRecaptchaConfig();
    assert(typeof config.isEnabled === 'boolean', 'config.isEnabled is boolean');
    assert(config.version === 'v2' || config.version === 'v3', 'config.version is valid');
    assert(typeof config.siteKey === 'string', 'config.siteKey is string');
    assert(typeof config.secretKey === 'string', 'config.secretKey is string');

    // ----------------------------------------------------
    // PHASE 2: Graceful Zero-Configuration Bypass
    // ----------------------------------------------------
    console.log('\n[Phase 2] Testing zero-config bypass when disabled...');
    // Ensure recaptcha_is_on is off
    await SystemSetting.updateOne(
      { key: 'recaptcha_is_on', group: 'recaptcha' },
      { $set: { value: 'off' } },
      { upsert: true }
    );

    const bypassCheck = await verifyRecaptchaToken(undefined);
    assert(bypassCheck.success === true, 'Verification succeeds when disabled');
    assert(bypassCheck.bypassed === true, 'Bypass flag is set to true when disabled');

    const bypassWithEmptyToken = await verifyRecaptchaToken('');
    assert(bypassWithEmptyToken.success === true, 'Empty token passes when disabled');
    assert(bypassWithEmptyToken.bypassed === true, 'Empty token bypass flag is true');

    // ----------------------------------------------------
    // PHASE 3: Public Configuration Action & Security
    // ----------------------------------------------------
    console.log('\n[Phase 3] Testing public reCAPTCHA config exposure (Secret Key Privacy)...');
    const publicConfigRes = await getPublicRecaptchaConfigAction();
    assert(publicConfigRes.success === true, 'getPublicRecaptchaConfigAction succeeded');
    assert(
      !('secretKey' in publicConfigRes.data),
      'Public config strictly does NOT expose secretKey'
    );
    assert(typeof publicConfigRes.data.version === 'string', 'Version exposed to frontend');

    // ----------------------------------------------------
    // PHASE 4: Enforced Validation (Simulated Active State)
    // ----------------------------------------------------
    console.log('\n[Phase 4] Testing token enforcement when active...');
    // Enable reCAPTCHA with a test secret key
    await SystemSetting.updateOne(
      { key: 'recaptcha_is_on', group: 'recaptcha' },
      { $set: { value: 'on' } },
      { upsert: true }
    );
    await SystemSetting.updateOne(
      { key: 'recaptcha_secret_key', group: 'recaptcha' },
      { $set: { value: '6LeIxacZAAAAAFakeSecretKeyForTestingPurposeOnly123' } },
      { upsert: true }
    );

    const isEnabled = await isRecaptchaEnabled();
    assert(isEnabled === true, 'reCAPTCHA engine recognized active state');

    // Test missing token when active
    const missingTokenResult = await verifyRecaptchaToken(null);
    assert(missingTokenResult.success === false, 'Missing token is rejected when active');
    assert(
      missingTokenResult.error?.includes('required') === true,
      'Descriptive error returned for missing token'
    );

    // Test invalid / dummy token against Google API
    console.log('  Testing invalid token against Google siteverify...');
    const invalidTokenResult = await verifyRecaptchaToken('dummy_invalid_client_response_token_xyz');
    assert(invalidTokenResult.success === false, 'Invalid token rejected by Google verification');

    // Test Server Action wrapper
    const actionValidationResult = await verifyRecaptchaTokenAction('');
    assert(actionValidationResult.success === false, 'Empty token rejected by verifyRecaptchaTokenAction');

    // ----------------------------------------------------
    // PHASE 5: Public Mutation Action Integration Checks
    // ----------------------------------------------------
    console.log('\n[Phase 5] Testing integration into public mutating Server Actions...');

    // 5.1 Test registration rejection when reCAPTCHA is active and token is missing
    const fakeEmail = `recaptcha_test_${Date.now()}@example.com`;
    const regResultWithRecaptcha = await registerCompanyAction({
      name: 'Bot User',
      email: fakeEmail,
      password: 'Password123!',
      businessName: 'Bot Business',
    });
    assert(
      regResultWithRecaptcha.success === false,
      'Registration without reCAPTCHA token is blocked when active'
    );
    assert(
      regResultWithRecaptcha.error?.toLowerCase().includes('recaptcha') === true,
      'Registration error mentions reCAPTCHA requirement'
    );

    // 5.2 Restore reCAPTCHA to OFF and verify registration works with zero-config bypass
    console.log('  Testing registration bypass when reCAPTCHA is turned off...');
    await SystemSetting.updateOne(
      { key: 'recaptcha_is_on', group: 'recaptcha' },
      { $set: { value: 'off' } }
    );

    const regResultBypassed = await registerCompanyAction({
      name: 'Legitimate User',
      email: fakeEmail,
      password: 'Password123!',
      businessName: 'Legitimate Business',
    });
    assert(regResultBypassed.success === true, 'Registration succeeds when reCAPTCHA is off');

    // Cleanup registered user
    if (regResultBypassed.userId) {
      await User.deleteOne({ _id: regResultBypassed.userId });
      await Business.deleteOne({ companyId: regResultBypassed.userId });
    }

    console.log(`\n🎉 ALL ${passed} ASSERTIONS PASSED WITH ZERO ERRORS! [BGO-233 VERIFIED]`);
  } finally {
    // ----------------------------------------------------
    // CLEANUP: Restore original settings
    // ----------------------------------------------------
    console.log('\n[Cleanup] Restoring original reCAPTCHA settings in Atlas...');
    for (const setting of originalSettings) {
      await SystemSetting.updateOne(
        { key: setting.key, group: setting.group },
        { $set: { value: setting.value } },
        { upsert: true }
      );
    }
    console.log('✅ Original system settings restored successfully');
  }
}

runRecaptchaTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  });
