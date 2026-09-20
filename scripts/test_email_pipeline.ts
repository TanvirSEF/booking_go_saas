import { Types } from 'mongoose';
import { connectToDatabase } from '../lib/db';
import { EmailTemplate } from '../models/EmailTemplate';
import { Appointment } from '../models/Appointment';
import { Business } from '../models/Business';
import { Service } from '../models/Service';
import { Staff } from '../models/Staff';
import { Location } from '../models/Location';
import {
  parseEmailShortcodes,
  renderTemplatedEmail,
  ensureSystemTemplatesSeeded,
} from '../lib/email-engine';
import { dispatchAppointmentEmailEvent } from '../lib/email-events';

async function runEmailPipelineTests() {
  console.log('--- 🧪 STARTING TRANSACTIONAL EMAIL PIPELINE TESTS [BGO-236] ---');

  await connectToDatabase();
  console.log('✅ Connected to MongoDB Atlas');

  let passed = 0;
  function assert(condition: boolean, message: string) {
    if (!condition) {
      console.error(`❌ Assertion Failed: ${message}`);
      throw new Error(`Assertion Failed: ${message}`);
    }
    console.log(`  ✓ ${message}`);
    passed++;
  }

  // Phase 1: Ensure system templates are seeded in database
  console.log('\n[Phase 1] Verifying system templates in MongoDB Atlas...');
  await ensureSystemTemplatesSeeded();
  const systemTemplates = await EmailTemplate.find({ isSystem: true }).lean();
  assert(systemTemplates.length >= 4, `At least 4 system templates seeded in Atlas (found ${systemTemplates.length})`);

  const slugs = systemTemplates.map((t) => t.slug);
  assert(slugs.includes('create-appointment'), 'create-appointment system template present');
  assert(slugs.includes('appointment-status-change'), 'appointment-status-change system template present');
  assert(slugs.includes('appointment-reminder'), 'appointment-reminder system template present');
  assert(slugs.includes('new-user'), 'new-user system template present');

  // Phase 2: Variable Interpolation & Shortcode Replacement Logic
  console.log('\n[Phase 2] Testing shortcode template interpolation...');
  const templateStr = 'Hello {customer_name}, your booking #{appointment_number} for {service_name} on {appointment_date} is {status}.';
  const variables = {
    customer_name: 'Tanvir Hasan',
    appointment_number: 'APP-1001',
    service_name: 'Hair Styling & Beard Trim',
    appointment_date: '2026-09-25',
    status: 'Confirmed',
  };

  const parsed = parseEmailShortcodes(templateStr, variables);
  assert(parsed.includes('Hello Tanvir Hasan'), 'customer_name correctly interpolated');
  assert(parsed.includes('#APP-1001'), 'appointment_number correctly interpolated');
  assert(parsed.includes('Hair Styling & Beard Trim'), 'service_name correctly interpolated');
  assert(parsed.includes('on 2026-09-25'), 'appointment_date correctly interpolated');
  assert(parsed.includes('is Confirmed'), 'status correctly interpolated');

  // Case-insensitivity and extra whitespace handling
  const trickyStr = 'Welcome { CUSTOMER_NAME } to { App_Name }!';
  const parsedTricky = parseEmailShortcodes(trickyStr, {
    customer_name: 'Rahim',
    app_name: 'BookingGo',
  });
  assert(parsedTricky === 'Welcome Rahim to BookingGo!', 'Whitespace & case-insensitive tokens parsed seamlessly');

  // Phase 3: Rendering Templated Email with Layout
  console.log('\n[Phase 3] Testing renderTemplatedEmail with full layout...');
  const rendered = await renderTemplatedEmail({
    templateNameOrSlug: 'create-appointment',
    variables: {
      customer: 'Sultana Ahmed',
      appointment_number: 'APP-8842',
      service: 'Dental Examination',
      appointment_date: '2026-09-28',
      appointment_time: '11:00 AM',
      location: 'Central Clinic',
      staff: 'Dr. Michael Chen',
      business_name: 'Elite Health Care',
    },
  });

  assert(typeof rendered.subject === 'string' && rendered.subject.length > 0, 'Rendered subject is non-empty string');
  assert(rendered.subject.includes('Dental Examination') || rendered.subject.includes('APP-8842'), 'Subject contains interpolated service or appointment reference');
  assert(typeof rendered.html === 'string' && rendered.html.includes('<!DOCTYPE html>'), 'Rendered HTML contains full standard email boilerplate');
  assert(rendered.html.includes('Elite Health Care'), 'HTML body contains business name');
  assert(rendered.html.includes('Dr. Michael Chen'), 'HTML body contains staff name');

  // Phase 4: Company-Specific Template Customization Override
  console.log('\n[Phase 4] Testing company-specific template override priority...');
  const testCompanyId = new Types.ObjectId();
  const customCompanyTemplate = await EmailTemplate.create({
    name: 'Custom VIP Confirmation',
    slug: 'create-appointment',
    moduleName: 'Appointment',
    from: 'VIP Concierge',
    companyId: testCompanyId,
    variables: ['customer_name', 'appointment_number'],
    isSystem: false,
    translations: [
      {
        lang: 'en',
        subject: '[VIP Booking] Exclusive Confirmation for {customer_name}',
        content: '<p>Welcome VIP client {customer_name}, your reference is #{appointment_number}.</p>',
      },
    ],
  });

  const companyRendered = await renderTemplatedEmail({
    templateNameOrSlug: 'create-appointment',
    companyId: String(testCompanyId),
    variables: {
      customer_name: 'Zakir Hossain',
      appointment_number: 'VIP-777',
    },
  });

  assert(
    companyRendered.subject === '[VIP Booking] Exclusive Confirmation for Zakir Hossain',
    'Company customized template overrides global system template'
  );
  assert(companyRendered.html.includes('VIP-777'), 'Customized template content contains VIP reference');

  // Cleanup custom company template
  await EmailTemplate.deleteOne({ _id: customCompanyTemplate._id });
  console.log('  ✓ Temporary company template cleaned up successfully');

  // Phase 5: Live Appointment Event Dispatch (appointment_created)
  console.log('\n[Phase 5] Testing dispatchAppointmentEmailEvent ("appointment_created")...');
  let testAppointment = await Appointment.findOne({ email: { $exists: true, $ne: '' } }).lean();

  if (!testAppointment) {
    // Provision temporary fixture appointment if none exists in Atlas
    const sampleBiz = (await Business.findOne().lean()) || {
      _id: new Types.ObjectId(),
      companyId: new Types.ObjectId(),
      name: 'Demo Salon',
      slug: 'demo-salon',
      currencySymbol: '$',
    };
    const sampleSvc = (await Service.findOne().lean()) || {
      _id: new Types.ObjectId(),
      name: 'Spa Treatment',
      price: 50,
    };
    const sampleStf = (await Staff.findOne().lean()) || {
      _id: new Types.ObjectId(),
      name: 'Emma Watson',
    };
    const sampleLoc = (await Location.findOne().lean()) || {
      _id: new Types.ObjectId(),
      name: 'Downtown Office',
    };

    testAppointment = await Appointment.create({
      appointmentNumber: 'TEST-EVT-001',
      companyId: sampleBiz.companyId,
      businessId: sampleBiz._id,
      customerType: 'guest-user',
      name: 'Test Customer',
      email: 'customer.test@bookinggo.local',
      contact: '+1234567890',
      locationId: sampleLoc._id,
      serviceId: sampleSvc._id,
      staffId: sampleStf._id,
      date: '2026-09-30',
      time: '14:00',
      durationMinutes: 45,
      price: 50,
      paymentType: 'Manual',
      paymentStatus: 'unpaid',
      appointmentStatus: 'Pending',
      statusColor: '#21c9b0',
    });
  }

  const createdDispatchResult = await dispatchAppointmentEmailEvent(
    'appointment_created',
    testAppointment._id
  );

  assert(createdDispatchResult.success, 'appointment_created event dispatched successfully');
  assert(createdDispatchResult.customerDelivered, 'Customer delivery flag marked true');
  assert(createdDispatchResult.recipientCount >= 1, 'At least 1 recipient received the notification');

  // Phase 6: Live Appointment Event Dispatch (appointment_status_changed)
  console.log('\n[Phase 6] Testing dispatchAppointmentEmailEvent ("appointment_status_changed")...');
  const statusDispatchResult = await dispatchAppointmentEmailEvent(
    'appointment_status_changed',
    testAppointment._id,
    { status: 'Confirmed' }
  );

  assert(statusDispatchResult.success, 'appointment_status_changed event dispatched successfully');
  assert(statusDispatchResult.event === 'appointment_status_changed', 'Event type correctly tracked');
  assert(statusDispatchResult.customerDelivered, 'Status update delivered to customer');

  // Phase 7: Non-Blocking Resilience Safeguard
  console.log('\n[Phase 7] Testing non-blocking error resilience with invalid ID...');
  const fakeId = new Types.ObjectId();
  const nonExistentResult = await dispatchAppointmentEmailEvent('appointment_created', fakeId);

  assert(!nonExistentResult.success, 'Non-existent appointment safely returns failure status');
  assert(typeof nonExistentResult.error === 'string', 'Descriptive error returned without crashing server');

  console.log(`\n🎉 ALL ${passed} ASSERTIONS PASSED WITH ZERO ERRORS! [BGO-236 VERIFIED]`);
  process.exit(0);
}

runEmailPipelineTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
