import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db';
import { Business } from '../models/Business';
import { Service } from '../models/Service';
import { Staff } from '../models/Staff';
import { Location } from '../models/Location';
import { User } from '../models/User';
import { CustomField } from '../models/CustomField';
import { Appointment } from '../models/Appointment';
import { AppointmentPayment } from '../models/AppointmentPayment';
import {
  validateAndSanitizeCustomFields,
  formatCustomFieldsForEmail,
} from '../lib/custom-fields';
import { createAppointment } from '../actions/appointment';

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
  console.log('🚀 Running Live Atlas Integration Tests: Dynamic Custom Fields Engine');
  console.log('=====================================================================\n');

  await connectToDatabase();

  const testSuffix = `test_${Date.now()}`;
  const companyUser = await User.create({
    name: 'Custom Fields Test Owner',
    email: `cf_owner_${testSuffix}@example.com`,
    password: 'Password123!',
    role: 'company',
  });

  const business = await Business.create({
    companyId: companyUser._id,
    name: 'Auto & Spa Multi-Service Center',
    slug: `auto-spa-${testSuffix}`,
    currency: 'USD',
    currencySymbol: '$',
    themeColor: '#2563eb',
    businessHours: [
      { dayName: 'Monday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
      { dayName: 'Tuesday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
      { dayName: 'Wednesday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
      { dayName: 'Thursday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
      { dayName: 'Friday', isOpen: true, startTime: '09:00', endTime: '18:00', breakHours: [] },
      { dayName: 'Saturday', isOpen: false, startTime: '09:00', endTime: '18:00', breakHours: [] },
      { dayName: 'Sunday', isOpen: false, startTime: '09:00', endTime: '18:00', breakHours: [] },
    ],
  });

  const location = await Location.create({
    companyId: companyUser._id,
    businessId: business._id,
    name: 'Central Garage & Lounge',
    address: '100 Industrial Parkway',
    phone: '555-0199',
  });

  const testCategoryId = new mongoose.Types.ObjectId();

  const service = await Service.create({
    companyId: companyUser._id,
    businessId: business._id,
    categoryId: testCategoryId,
    name: 'Executive Detailing & Tune-up',
    durationMinutes: 60,
    price: 150,
    isActive: true,
  });

  const staffUser = await User.create({
    name: 'Marcus Vance',
    email: `marcus_${testSuffix}@autospa.com`,
    password: 'Password123!',
    role: 'staff',
  });

  const staff = await Staff.create({
    companyId: companyUser._id,
    businessId: business._id,
    userId: staffUser._id,
    name: 'Marcus Vance',
    locationIds: [location._id],
    serviceIds: [service._id],
    colorCode: '#2563eb',
    isActive: true,
  });

  // Provision Suite of 8 Custom Field Types
  const field1_text = await CustomField.create({
    companyId: companyUser._id,
    businessId: business._id,
    label: 'Vehicle License Plate',
    type: 'text',
    placeholder: 'e.g. ABC-1234',
    isRequired: true,
    order: 1,
  });

  const field2_number = await CustomField.create({
    companyId: companyUser._id,
    businessId: business._id,
    label: 'Odometer Reading (Miles)',
    type: 'number',
    placeholder: 'e.g. 45000',
    isRequired: true,
    order: 2,
  });

  await CustomField.create({
    companyId: companyUser._id,
    businessId: business._id,
    label: 'Secondary Contact Email',
    type: 'email',
    placeholder: 'manager@fleet.com',
    isRequired: false,
    order: 3,
  });

  await CustomField.create({
    companyId: companyUser._id,
    businessId: business._id,
    label: 'Preferred Pickup Date',
    type: 'date',
    isRequired: false,
    order: 4,
  });

  const field5_select = await CustomField.create({
    companyId: companyUser._id,
    businessId: business._id,
    label: 'Fuel Engine Type',
    type: 'select',
    options: ['Gasoline', 'Diesel', 'Hybrid', 'Electric'],
    isRequired: true,
    order: 5,
  });

  await CustomField.create({
    companyId: companyUser._id,
    businessId: business._id,
    label: 'Wash Preference',
    type: 'radio',
    options: ['Eco Hand Wash', 'Touchless Automatic', 'Ceramic Polish'],
    isRequired: false,
    order: 6,
  });

  await CustomField.create({
    companyId: companyUser._id,
    businessId: business._id,
    label: 'Complimentary Amenities',
    type: 'checkbox',
    options: ['Free Espresso', 'High-Speed Wi-Fi', 'Loaner Vehicle'],
    isRequired: false,
    order: 7,
  });

  const field8_textarea = await CustomField.create({
    companyId: companyUser._id,
    businessId: business._id,
    label: 'Special Mechanic Instructions',
    type: 'textarea',
    placeholder: 'Note any unusual noises or specific areas...',
    isRequired: false,
    order: 8,
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Required Field Enforcement (Missing / Empty Checks)
    // -------------------------------------------------------------
    console.log('👉 Test 1: Required Field Enforcement');
    const emptyResult = await validateAndSanitizeCustomFields(business._id, {});
    assert(emptyResult.success === false, 'Rejects empty customFields when required fields exist');
    assert(
      emptyResult.error?.includes('is required'),
      `Returns descriptive required error: "${emptyResult.error}"`
    );

    const whitespaceResult = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': '    ',
    });
    assert(whitespaceResult.success === false, 'Rejects whitespace-only string for required field');
    assert(whitespaceResult.error === 'Vehicle License Plate is required.', 'Identifies specific missing required field');

    const partialRequired = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': 'NYC-9876',
    });
    assert(partialRequired.success === false, 'Rejects when second required field is missing');
    assert(partialRequired.error === 'Odometer Reading (Miles) is required.', 'Enforces second required field');

    // -------------------------------------------------------------
    // Test 2: Number Validation & Coercion
    // -------------------------------------------------------------
    console.log('\n👉 Test 2: Number Validation & Coercion');
    const invalidNumberResult = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': 'NYC-9876',
      'Odometer Reading (Miles)': 'fifty-thousand',
      'Fuel Engine Type': 'Hybrid',
    });
    assert(invalidNumberResult.success === false, 'Rejects non-numeric string for number field');
    assert(
      invalidNumberResult.error === 'Odometer Reading (Miles) must be a valid number.',
      'Returns descriptive number type error'
    );

    const validNumericString = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': 'NYC-9876',
      'Odometer Reading (Miles)': '52400',
      'Fuel Engine Type': 'Hybrid',
    });
    assert(validNumericString.success === true, 'Accepts valid numeric string');
    assert(validNumericString.data?.['Odometer Reading (Miles)'] === 52400, 'Coerces numeric string to JavaScript number');

    const validNumberLiteral = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': 'NYC-9876',
      'Odometer Reading (Miles)': 38000,
      'Fuel Engine Type': 'Hybrid',
    });
    assert(validNumberLiteral.success === true, 'Accepts numeric literal');
    assert(validNumberLiteral.data?.['Odometer Reading (Miles)'] === 38000, 'Preserves numeric literal value');

    // -------------------------------------------------------------
    // Test 3: Email Validation
    // -------------------------------------------------------------
    console.log('\n👉 Test 3: Email Format Validation');
    const invalidEmailResult = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': 'NYC-9876',
      'Odometer Reading (Miles)': 38000,
      'Fuel Engine Type': 'Hybrid',
      'Secondary Contact Email': 'not-an-email-address',
    });
    assert(invalidEmailResult.success === false, 'Rejects invalid email format');
    assert(
      invalidEmailResult.error === 'Secondary Contact Email must be a valid email address.',
      'Returns descriptive email error message'
    );

    const validEmailResult = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': 'NYC-9876',
      'Odometer Reading (Miles)': 38000,
      'Fuel Engine Type': 'Hybrid',
      'Secondary Contact Email': '  FleetManager@Company.COM  ',
    });
    assert(validEmailResult.success === true, 'Accepts valid email');
    assert(
      validEmailResult.data?.['Secondary Contact Email'] === 'fleetmanager@company.com',
      'Normalizes email to lowercase trimmed string'
    );

    // -------------------------------------------------------------
    // Test 4: Date Format Validation
    // -------------------------------------------------------------
    console.log('\n👉 Test 4: Date Format Validation');
    const invalidDateResult = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': 'NYC-9876',
      'Odometer Reading (Miles)': 38000,
      'Fuel Engine Type': 'Hybrid',
      'Preferred Pickup Date': 'tomorrow-morning',
    });
    assert(invalidDateResult.success === false, 'Rejects non-parseable date string');
    assert(
      invalidDateResult.error === 'Preferred Pickup Date must be a valid date.',
      'Returns descriptive date error message'
    );

    const validDateResult = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': 'NYC-9876',
      'Odometer Reading (Miles)': 38000,
      'Fuel Engine Type': 'Hybrid',
      'Preferred Pickup Date': '2026-10-15',
    });
    assert(validDateResult.success === true, 'Accepts valid YYYY-MM-DD date format');
    assert(validDateResult.data?.['Preferred Pickup Date'] === '2026-10-15', 'Stores formatted date string');

    // -------------------------------------------------------------
    // Test 5: Select & Radio Options Whitelisting
    // -------------------------------------------------------------
    console.log('\n👉 Test 5: Select & Radio Options Whitelisting');
    const invalidSelectResult = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': 'NYC-9876',
      'Odometer Reading (Miles)': 38000,
      'Fuel Engine Type': 'Rocket Fuel',
    });
    assert(invalidSelectResult.success === false, 'Rejects unconfigured option for select field');
    assert(
      invalidSelectResult.error === 'Fuel Engine Type contains an invalid selection.',
      'Returns invalid selection error'
    );

    const validSelectResult = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': 'NYC-9876',
      'Odometer Reading (Miles)': 38000,
      'Fuel Engine Type': 'electric', // case-insensitive match
    });
    assert(validSelectResult.success === true, 'Accepts valid select option with case normalization');
    assert(validSelectResult.data?.['Fuel Engine Type'] === 'Electric', 'Normalizes choice to exact configured option casing');

    const invalidRadioResult = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': 'NYC-9876',
      'Odometer Reading (Miles)': 38000,
      'Fuel Engine Type': 'Electric',
      'Wash Preference': 'Acid Bath',
    });
    assert(invalidRadioResult.success === false, 'Rejects unconfigured option for radio field');
    assert(
      invalidRadioResult.error === 'Wash Preference contains an invalid selection.',
      'Returns invalid radio selection error'
    );

    const validRadioResult = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': 'NYC-9876',
      'Odometer Reading (Miles)': 38000,
      'Fuel Engine Type': 'Electric',
      'Wash Preference': 'Ceramic Polish',
    });
    assert(validRadioResult.success === true, 'Accepts valid radio choice');
    assert(validRadioResult.data?.['Wash Preference'] === 'Ceramic Polish', 'Stores selected radio option');

    // -------------------------------------------------------------
    // Test 6: Checkbox Multi-Options Validation
    // -------------------------------------------------------------
    console.log('\n👉 Test 6: Checkbox Multi-Options Validation');
    const invalidCheckboxResult = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': 'NYC-9876',
      'Odometer Reading (Miles)': 38000,
      'Fuel Engine Type': 'Electric',
      'Complimentary Amenities': ['Free Espresso', 'Free Champagne Bar'],
    });
    assert(invalidCheckboxResult.success === false, 'Rejects array containing illegal option');
    assert(
      invalidCheckboxResult.error === 'Complimentary Amenities contains invalid options.',
      'Returns invalid options error for checkbox'
    );

    const validCheckboxResult = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': 'NYC-9876',
      'Odometer Reading (Miles)': 38000,
      'Fuel Engine Type': 'Electric',
      'Complimentary Amenities': ['Free Espresso', 'Loaner Vehicle'],
    });
    assert(validCheckboxResult.success === true, 'Accepts valid array of checkbox options');
    assert(
      Array.isArray(validCheckboxResult.data?.['Complimentary Amenities']) &&
        (validCheckboxResult.data?.['Complimentary Amenities'] as string[]).length === 2,
      'Stores selected checkbox options as clean array'
    );

    const commaStringCheckboxResult = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': 'NYC-9876',
      'Odometer Reading (Miles)': 38000,
      'Fuel Engine Type': 'Electric',
      'Complimentary Amenities': 'Free Espresso, High-Speed Wi-Fi',
    });
    assert(commaStringCheckboxResult.success === true, 'Parses comma-delimited string for checkboxes');

    // -------------------------------------------------------------
    // Test 7: Anti-Pollution & Security Guard
    // -------------------------------------------------------------
    console.log('\n👉 Test 7: Anti-Pollution & Unknown Field Stripping');
    const injectedPayloadResult = await validateAndSanitizeCustomFields(business._id, {
      'Vehicle License Plate': 'NYC-9876',
      'Odometer Reading (Miles)': 38000,
      'Fuel Engine Type': 'Electric',
      '$where': 'sleep(5000)',
      'injected_admin_override': true,
      'unconfiguredField': 'malicious string',
    });
    assert(injectedPayloadResult.success === true, 'Validates successfully while dropping injected keys');
    assert(injectedPayloadResult.data?.['$where'] === undefined, 'Drops MongoDB operator injection ($where)');
    assert(injectedPayloadResult.data?.['injected_admin_override'] === undefined, 'Drops unconfigured admin override key');
    assert(injectedPayloadResult.data?.['unconfiguredField'] === undefined, 'Drops unconfigured field');

    // -------------------------------------------------------------
    // Test 8: Dual-Key Access Strategy (By Field ID & Label)
    // -------------------------------------------------------------
    console.log('\n👉 Test 8: Dual-Key Access Strategy');
    const wizardStyleSubmission = await validateAndSanitizeCustomFields(business._id, {
      [field1_text._id.toString()]: 'BGO-7777',
      [field2_number._id.toString()]: '12500',
      [field5_select._id.toString()]: 'Gasoline',
      [field8_textarea._id.toString()]: 'Check front brake pads please.',
    });
    assert(wizardStyleSubmission.success === true, 'Validates wizard submission keyed by field ID');
    assert(
      wizardStyleSubmission.data?.[field1_text._id.toString()] === 'BGO-7777',
      'Value accessible via field ID'
    );
    assert(
      wizardStyleSubmission.data?.['Vehicle License Plate'] === 'BGO-7777',
      'Value simultaneously accessible via human-readable Label'
    );
    assert(
      wizardStyleSubmission.data?.['Special Mechanic Instructions'] === 'Check front brake pads please.',
      'Textarea stored properly under label'
    );

    // -------------------------------------------------------------
    // Test 9: End-to-End Server Action createAppointment Integration
    // -------------------------------------------------------------
    console.log('\n👉 Test 9: End-to-End Server Action createAppointment Integration');

    // 9a. Submit booking with missing required custom field -> MUST FAIL
    const failedBooking = await createAppointment({
      businessId: business._id.toString(),
      serviceId: service._id.toString(),
      staffId: staff._id.toString(),
      locationId: location._id.toString(),
      date: '2026-10-15',
      time: '10:00',
      customerType: 'guest-user',
      name: 'John Guest',
      email: `john_${testSuffix}@example.com`,
      contact: '555-9999',
      customFields: {
        'Vehicle License Plate': 'CAL-1010',
        // 'Odometer Reading' and 'Fuel Engine Type' intentionally omitted!
      },
    });
    assert(failedBooking.success === false, 'createAppointment rejects booking with missing required custom fields');
    assert(
      failedBooking.error?.includes('is required'),
      `createAppointment returns specific custom field error: "${failedBooking.error}"`
    );

    // 9b. Submit booking with valid custom fields -> MUST SUCCEED
    const successfulBooking = await createAppointment({
      businessId: business._id.toString(),
      serviceId: service._id.toString(),
      staffId: staff._id.toString(),
      locationId: location._id.toString(),
      date: '2026-10-15',
      time: '10:00',
      customerType: 'guest-user',
      name: 'John Guest',
      email: `john_${testSuffix}@example.com`,
      contact: '555-9999',
      customFields: {
        'Vehicle License Plate': 'CAL-1010',
        'Odometer Reading (Miles)': 65000,
        'Fuel Engine Type': 'Diesel',
        'Complimentary Amenities': ['Free Espresso', 'High-Speed Wi-Fi'],
        'Special Mechanic Instructions': 'Check tire pressure.',
      },
    });

    assert(successfulBooking.success === true, 'createAppointment succeeds with valid custom fields');
    assert(Boolean(successfulBooking.appointmentId), 'Returns created appointment ID');

    // 9c. Verify persisted custom fields in MongoDB Atlas
    const savedAppointment = await Appointment.findById(successfulBooking.appointmentId).lean();
    assert(Boolean(savedAppointment), 'Appointment record found in MongoDB Atlas');
    const savedFields = savedAppointment?.customFields as Record<string, unknown>;
    assert(savedFields?.['Vehicle License Plate'] === 'CAL-1010', 'Persisted custom field: Vehicle License Plate');
    assert(savedFields?.['Odometer Reading (Miles)'] === 65000, 'Persisted custom field: Odometer Reading');
    assert(savedFields?.['Fuel Engine Type'] === 'Diesel', 'Persisted custom field: Fuel Engine Type');
    assert(
      Array.isArray(savedFields?.['Complimentary Amenities']) &&
        (savedFields['Complimentary Amenities'] as string[]).includes('Free Espresso'),
      'Persisted custom field: Amenities array'
    );
    assert(
      savedFields?.[field1_text._id.toString()] === 'CAL-1010',
      'Dual-key: Field ID key persisted in database'
    );

    // -------------------------------------------------------------
    // Test 10: Email Token Formatting
    // -------------------------------------------------------------
    console.log('\n👉 Test 10: Email Token Formatting (formatCustomFieldsForEmail)');
    const emailFormatted = formatCustomFieldsForEmail(savedFields);
    assert(emailFormatted.includes('• Vehicle License Plate: CAL-1010'), 'Formats License Plate with bullet');
    assert(emailFormatted.includes('• Odometer Reading (Miles): 65000'), 'Formats Odometer with bullet');
    assert(emailFormatted.includes('• Fuel Engine Type: Diesel'), 'Formats Fuel Type with bullet');
    assert(
      emailFormatted.includes('Free Espresso, High-Speed Wi-Fi'),
      'Formats array choices as comma-delimited string'
    );
    assert(
      !emailFormatted.includes(field1_text._id.toString()),
      'Filters out 24-character hexadecimal IDs from email display'
    );

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n=====================================================================');
    console.log(`🎉 All Dynamic Custom Fields Tests Passed: ${passedAssertions}/${totalAssertions} Assertions!`);
    console.log('=====================================================================\n');
  } finally {
    // Clean up test documents
    await AppointmentPayment.deleteMany({ businessId: business._id });
    await Appointment.deleteMany({ businessId: business._id });
    await CustomField.deleteMany({ businessId: business._id });
    await Staff.deleteMany({ businessId: business._id });
    await Service.deleteMany({ businessId: business._id });
    await Location.deleteMany({ businessId: business._id });
    await Business.findByIdAndDelete(business._id);
    await User.findByIdAndDelete(companyUser._id);
    await User.findByIdAndDelete(staffUser._id);
    // Allow any in-flight background email dispatch to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await mongoose.disconnect();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });
