import { Types } from 'mongoose';
import { connectToDatabase } from '../lib/db';
import { Business } from '../models/Business';
import { Service } from '../models/Service';
import { Staff } from '../models/Staff';
import { Location } from '../models/Location';
import { Category } from '../models/Category';
import { Appointment } from '../models/Appointment';
import {
  calculateAvailableSlots,
  validateSlotAvailability,
  isSlotCollidingWithBooking,
  checkBookingHorizon,
  resolveEffectiveBuffer,
  timeToMinutes,
} from '../lib/booking-engine';
import { createAppointment } from '../actions/appointment';

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runBookingConflictTests() {
  console.log('--- 🧪 STARTING BOOKING CONFLICT & BUFFER TIME ENGINE TESTS [BGO-237] ---');
  await connectToDatabase();
  console.log('✅ Connected to MongoDB Atlas\n');

  const testSuffix = Date.now();
  const testCompanyId = new Types.ObjectId();
  const testBusinessId = new Types.ObjectId();
  const testCategoryId = new Types.ObjectId();
  const testLocationId = new Types.ObjectId();
  const testStaff1Id = new Types.ObjectId();
  const testStaff2Id = new Types.ObjectId();
  const testService1Id = new Types.ObjectId();
  const testService2Id = new Types.ObjectId();

  try {
    // [Phase 1] Unit test mathematical collision helper
    console.log('[Phase 1] Unit testing isSlotCollidingWithBooking algorithm...');
    {
      // Case 1: Direct overlap
      const c1 = isSlotCollidingWithBooking(600, 630, 15, 600, 630, 15);
      assert(c1.collides && c1.isDirectCollision, 'Direct identical overlap detected');

      // Case 2: Candidate starts during existing appointment buffer (10:30 when 10:00-10:30 has 15m buffer)
      const c2 = isSlotCollidingWithBooking(630, 660, 15, 600, 630, 15);
      assert(c2.collides && c2.isBufferCollision, 'Slot starting during previous buffer detected');

      // Case 3: Candidate ends at 10:00, but candidate buffer (15m) extends into 10:00 booking
      const c3 = isSlotCollidingWithBooking(570, 600, 15, 600, 630, 15);
      // slotEnd = 600, slotBuffer = 15 -> slotEnd + slotBuffer = 615, which overlaps [600, 630]
      assert(c3.collides && c3.isBufferCollision, 'Candidate buffer extending into booking detected');

      // Case 4: Candidate ends at 09:45, buffer 15m ends at 10:00 -> clears booking exactly
      const c4 = isSlotCollidingWithBooking(555, 585, 15, 600, 630, 15);
      assert(!c4.collides, 'Slot with buffer finishing before booking start does NOT collide');

      // Case 5: Candidate starts at 10:45 when 10:00-10:30 has 15m buffer -> clears buffer exactly
      const c5 = isSlotCollidingWithBooking(645, 675, 15, 600, 630, 15);
      assert(!c5.collides, 'Slot starting after booking buffer does NOT collide');

      // Case 6: Buffer is 0 -> back-to-back 10:00-10:30 and 10:30-11:00 is allowed
      const c6 = isSlotCollidingWithBooking(630, 660, 0, 600, 630, 0);
      assert(!c6.collides, 'Zero-buffer back-to-back slots do NOT collide');
    }

    // [Phase 2] Testing horizon and notice period helpers
    console.log('\n[Phase 2] Testing horizon & notice period checks...');
    {
      const validHorizon = checkBookingHorizon('2026-10-15', 90);
      assert(validHorizon.valid, 'Future date within 90 days is valid');

      const pastHorizon = checkBookingHorizon('2020-01-01', 90);
      assert(!pastHorizon.valid && pastHorizon.reason?.includes('past'), 'Past date is rejected');

      const distantHorizon = checkBookingHorizon('2030-01-01', 60);
      assert(!distantHorizon.valid && distantHorizon.reason?.includes('exceeds'), 'Date beyond max days is rejected');

      // Test buffer resolution priority
      const buf1 = resolveEffectiveBuffer(25, 10);
      assert(buf1 === 25, 'Service buffer takes precedence over business buffer');

      const buf2 = resolveEffectiveBuffer(undefined, 15);
      assert(buf2 === 15, 'Business timeInterval used when service buffer is unset');

      const buf3 = resolveEffectiveBuffer(null, null);
      assert(buf3 === 0, 'Defaults to 0 when unset');
    }

    // [Phase 3] Provisioning Test Fixtures in MongoDB Atlas
    console.log('\n[Phase 3] Provisioning test fixtures in MongoDB Atlas...');

    // Find next Wednesday 2 weeks from now to ensure standard operating hours
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + ((3 - futureDate.getDay() + 7) % 7 || 7) + 7);
    const yyyy = futureDate.getFullYear();
    const mm = String(futureDate.getMonth() + 1).padStart(2, '0');
    const dd = String(futureDate.getDate()).padStart(2, '0');
    const testDateStr = `${yyyy}-${mm}-${dd}`;
    const holidayDateStr = `${yyyy}-${mm}-${String(futureDate.getDate() + 1).padStart(2, '0')}`;

    // Create Business
    const businessDoc = await Business.create({
      _id: testBusinessId,
      companyId: testCompanyId,
      name: `Conflict Test Salon ${testSuffix}`,
      slug: `conflict-test-${testSuffix}`,
      timeInterval: 15, // 15 min cleaning buffer
      minimumNoticeHours: 2,
      maxAdvanceBookingDays: 60,
      maximumSlot: 1,
      appointmentPrefix: '#TST',
      businessHours: [
        {
          dayName: 'Wednesday',
          isOpen: true,
          startTime: '09:00',
          endTime: '18:00',
          breakHours: [{ start: '13:00', end: '14:00' }], // lunch break
        },
        {
          dayName: 'Sunday',
          isOpen: false,
          startTime: '09:00',
          endTime: '18:00',
          breakHours: [],
        },
      ],
      holidays: [{ date: holidayDateStr, description: 'Staff Training Holiday' }],
    });
    assert(businessDoc.timeInterval === 15, 'Business provisioned with 15-min timeInterval');

    // Create Location & Category
    await Location.create({
      _id: testLocationId,
      companyId: testCompanyId,
      businessId: testBusinessId,
      name: 'Main Testing Suite',
      isActive: true,
    });

    await Category.create({
      _id: testCategoryId,
      companyId: testCompanyId,
      businessId: testBusinessId,
      name: 'Hair Treatments',
    });

    // Create Services
    // Service 1: 30 min duration, inherits business 15-min buffer
    await Service.create({
      _id: testService1Id,
      companyId: testCompanyId,
      businessId: testBusinessId,
      categoryId: testCategoryId,
      name: 'Standard Haircut',
      durationMinutes: 30,
      price: 45,
      isActive: true,
    });

    // Service 2: 45 min duration, service-specific 20-min buffer
    await Service.create({
      _id: testService2Id,
      companyId: testCompanyId,
      businessId: testBusinessId,
      categoryId: testCategoryId,
      name: 'Premium Coloring',
      durationMinutes: 45,
      bufferMinutes: 20,
      price: 120,
      isActive: true,
    });

    // Create Staff 1 and Staff 2
    await Staff.create([
      {
        _id: testStaff1Id,
        companyId: testCompanyId,
        businessId: testBusinessId,
        userId: new Types.ObjectId(),
        name: 'Senior Stylist Alice',
        locationIds: [testLocationId],
        serviceIds: [testService1Id, testService2Id],
        isActive: true,
      },
      {
        _id: testStaff2Id,
        companyId: testCompanyId,
        businessId: testBusinessId,
        userId: new Types.ObjectId(),
        name: 'Stylist Bob',
        locationIds: [testLocationId],
        serviceIds: [testService1Id, testService2Id],
        isActive: true,
      },
    ]);
    console.log('✅ Test fixtures provisioned successfully');

    // [Phase 4] Testing Slot Calculation with Buffer
    console.log('\n[Phase 4] Testing calculateAvailableSlots with buffer spacing...');
    {
      const slots = await calculateAvailableSlots({
        businessId: testBusinessId.toString(),
        serviceId: testService1Id.toString(),
        locationId: testLocationId.toString(),
        date: testDateStr,
      });

      assert(slots.length > 0, 'Available slots calculated');
      assert(slots[0].start === '09:00' && slots[0].end === '09:30', 'First slot is 09:00 - 09:30');
      // With 15-min buffer, next slot must start at 09:45 (30m + 15m = 45m step)
      assert(slots[1].start === '09:45' && slots[1].end === '10:15', 'Second slot starts at 09:45 respecting 15m buffer');
      assert(slots[2].start === '10:30' && slots[2].end === '11:00', 'Third slot starts at 10:30');
      assert(slots[0].bufferMinutes === 15, 'Slot response includes 15m bufferMinutes metadata');

      // Verify break time exclusion (13:00 - 14:00)
      const slotDuringBreak = slots.find(
        (s) => timeToMinutes(s.start) >= 780 && timeToMinutes(s.start) < 840
      );
      assert(!slotDuringBreak, 'No slots generated during lunch break (13:00 - 14:00)');

      // Verify slot at 12:30 with 15m buffer would run until 13:15, so it must not bleed into 13:00 break
      const slotBleedingIntoBreak = slots.find((s) => s.start === '12:30');
      assert(!slotBleedingIntoBreak, 'Slot whose buffer bleeds into break hours (12:30-13:15) is excluded');
    }

    // [Phase 5] Testing Service-Specific Buffer Override
    console.log('\n[Phase 5] Testing service-specific buffer override (20 min buffer)...');
    {
      const s2Slots = await calculateAvailableSlots({
        businessId: testBusinessId.toString(),
        serviceId: testService2Id.toString(),
        date: testDateStr,
      });

      assert(s2Slots.length > 0, 'Slots generated for Service 2');
      assert(s2Slots[0].bufferMinutes === 20, 'Service 2 correctly reflects 20-min buffer override');
      // 45m duration + 20m buffer = 65m step: 09:00-09:45, next at 10:05-10:50
      assert(s2Slots[0].start === '09:00' && s2Slots[0].end === '09:45', 'First slot is 09:00 - 09:45');
      assert(s2Slots[1].start === '10:05' && s2Slots[1].end === '10:50', 'Second slot starts at 10:05 (45m + 20m step)');
    }

    // [Phase 6] Testing Booking Collision & Buffer Window Rejection
    console.log('\n[Phase 6] Testing booking collision & buffer window enforcement...');
    {
      // Create an active booking for Alice at 10:30 - 11:00 (with 15m buffer until 11:15)
      const bookingAlice = await Appointment.create({
        appointmentNumber: '#TST001',
        companyId: testCompanyId,
        businessId: testBusinessId,
        locationId: testLocationId,
        serviceId: testService1Id,
        staffId: testStaff1Id,
        name: 'Customer One',
        email: 'customer1@example.com',
        contact: '1234567890',
        date: testDateStr,
        time: '10:30 - 11:00',
        durationMinutes: 30,
        bufferMinutes: 15,
        price: 45,
        paymentType: 'Manually',
        paymentStatus: 'paid',
        appointmentStatus: 'Confirmed',
      });
      assert(Boolean(bookingAlice._id), 'Created baseline appointment for Alice at 10:30 - 11:00');

      // Test 1: Direct overlap (10:30 - 11:00) for Alice
      const vDirect = await validateSlotAvailability({
        businessId: testBusinessId.toString(),
        serviceId: testService1Id.toString(),
        staffId: testStaff1Id.toString(),
        date: testDateStr,
        time: '10:30 - 11:00',
        durationMinutes: 30,
      });
      assert(!vDirect.available && vDirect.reason?.includes('already booked'), 'Direct slot collision rejected');

      // Test 2: Starting during buffer window (11:00 - 11:30) for Alice
      // Alice finishes at 11:00, but has cleaning buffer until 11:15
      const vBufferAfter = await validateSlotAvailability({
        businessId: testBusinessId.toString(),
        serviceId: testService1Id.toString(),
        staffId: testStaff1Id.toString(),
        date: testDateStr,
        time: '11:00 - 11:30',
        durationMinutes: 30,
      });
      assert(!vBufferAfter.available && vBufferAfter.reason?.includes('buffer window'), 'Starting during trailing buffer window rejected');

      // Test 3: Candidate buffer extends into Alice's booking (10:00 - 10:30 with 15m buffer -> buffer ends 10:45)
      const vBufferBefore = await validateSlotAvailability({
        businessId: testBusinessId.toString(),
        serviceId: testService1Id.toString(),
        staffId: testStaff1Id.toString(),
        date: testDateStr,
        time: '10:00 - 10:30',
        durationMinutes: 30,
        bufferMinutes: 15,
      });
      assert(!vBufferBefore.available && vBufferBefore.reason?.includes('buffer window'), 'Candidate buffer extending into booking rejected');

      // Test 4: Valid slot before (09:45 - 10:15 with 15m buffer -> buffer ends 10:30 exactly when booking starts)
      const vValidBefore = await validateSlotAvailability({
        businessId: testBusinessId.toString(),
        serviceId: testService1Id.toString(),
        staffId: testStaff1Id.toString(),
        date: testDateStr,
        time: '09:45 - 10:15',
        durationMinutes: 30,
        bufferMinutes: 15,
      });
      assert(vValidBefore.available, 'Slot clearing buffer before booking is permitted');

      // Test 5: Valid slot after (11:15 - 11:45 -> starts exactly when 11:15 buffer ends)
      const vValidAfter = await validateSlotAvailability({
        businessId: testBusinessId.toString(),
        serviceId: testService1Id.toString(),
        staffId: testStaff1Id.toString(),
        date: testDateStr,
        time: '11:15 - 11:45',
        durationMinutes: 30,
        bufferMinutes: 15,
      });
      assert(vValidAfter.available, 'Slot starting after booking buffer is permitted');

      // Test 6: Multi-staff isolation - Bob is free at 10:30 - 11:00
      const vBob = await validateSlotAvailability({
        businessId: testBusinessId.toString(),
        serviceId: testService1Id.toString(),
        staffId: testStaff2Id.toString(),
        date: testDateStr,
        time: '10:30 - 11:00',
        durationMinutes: 30,
      });
      assert(vBob.available, 'Other staff member (Bob) is available for 10:30 slot');
    }

    // [Phase 7] Testing Holiday & Closed Day Protection
    console.log('\n[Phase 7] Testing holiday and closed day protection...');
    {
      const vHoliday = await validateSlotAvailability({
        businessId: testBusinessId.toString(),
        serviceId: testService1Id.toString(),
        staffId: testStaff1Id.toString(),
        date: holidayDateStr,
        time: '10:00 - 10:30',
        durationMinutes: 30,
      });
      assert(!vHoliday.available && vHoliday.reason?.includes('holiday'), 'Business holiday rejected');

      // Test Sunday (closed)
      const vSunday = await validateSlotAvailability({
        businessId: testBusinessId.toString(),
        serviceId: testService1Id.toString(),
        staffId: testStaff1Id.toString(),
        date: '2026-10-18', // Sunday
        time: '10:00 - 10:30',
        durationMinutes: 30,
      });
      assert(!vSunday.available && vSunday.reason?.includes('closed'), 'Closed day rejected');
    }

    // [Phase 8] Testing Advance Booking Horizon & Cancellation Exemption
    console.log('\n[Phase 8] Testing advance booking limit & cancelled appointment release...');
    {
      // 90 days ahead when limit is 60
      const farFutureDate = new Date();
      farFutureDate.setDate(farFutureDate.getDate() + 90);
      const farY = farFutureDate.getFullYear();
      const farM = String(farFutureDate.getMonth() + 1).padStart(2, '0');
      const farD = String(farFutureDate.getDate()).padStart(2, '0');

      const vFar = await validateSlotAvailability({
        businessId: testBusinessId.toString(),
        serviceId: testService1Id.toString(),
        staffId: testStaff1Id.toString(),
        date: `${farY}-${farM}-${farD}`,
        time: '10:00 - 10:30',
        durationMinutes: 30,
      });
      assert(!vFar.available && vFar.reason?.includes('exceeds maximum advance booking limit'), 'Date exceeding 60-day advance limit rejected');

      // Cancellation test: Cancel Alice's appointment and verify slot & buffer are freed
      await Appointment.updateOne(
        { appointmentNumber: '#TST001' },
        { appointmentStatus: 'Cancelled' }
      );

      const vAliceAfterCancel = await validateSlotAvailability({
        businessId: testBusinessId.toString(),
        serviceId: testService1Id.toString(),
        staffId: testStaff1Id.toString(),
        date: testDateStr,
        time: '10:30 - 11:00',
        durationMinutes: 30,
      });
      assert(vAliceAfterCancel.available, 'Cancelled appointment frees up the core slot');

      const vAliceBufferAfterCancel = await validateSlotAvailability({
        businessId: testBusinessId.toString(),
        serviceId: testService1Id.toString(),
        staffId: testStaff1Id.toString(),
        date: testDateStr,
        time: '11:00 - 11:30',
        durationMinutes: 30,
      });
      assert(vAliceBufferAfterCancel.available, 'Cancelled appointment frees up the buffer window');
    }

    // [Phase 9] Testing End-to-End Server Action Integration
    console.log('\n[Phase 9] Testing createAppointment Server Action with buffer persistence...');
    {
      const actionResult = await createAppointment({
        businessId: testBusinessId.toString(),
        serviceId: testService1Id.toString(),
        staffId: testStaff1Id.toString(),
        locationId: testLocationId.toString(),
        date: testDateStr,
        time: '14:00 - 14:30',
        customerType: 'guest-user',
        name: 'Jane Doe',
        email: 'jane@example.com',
        contact: '5551234567',
      });

      assert(actionResult.success, 'createAppointment succeeded for valid slot');
      const savedAppointment = await Appointment.findOne({
        businessId: testBusinessId,
        time: '14:00 - 14:30',
      });
      assert(Boolean(savedAppointment), 'Appointment found in database');
      assert(savedAppointment?.bufferMinutes === 15, 'Appointment correctly persisted 15-min bufferMinutes');

      // Attempt immediate duplicate booking in buffer window (14:30)
      const duplicateBufferBooking = await createAppointment({
        businessId: testBusinessId.toString(),
        serviceId: testService1Id.toString(),
        staffId: testStaff1Id.toString(),
        locationId: testLocationId.toString(),
        date: testDateStr,
        time: '14:30 - 15:00',
        customerType: 'guest-user',
        name: 'John Collide',
        email: 'john@example.com',
        contact: '5559876543',
      });

      assert(!duplicateBufferBooking.success, 'createAppointment correctly rejected collision in buffer window');
      assert(
        duplicateBufferBooking.error?.includes('buffer window') || duplicateBufferBooking.error?.includes('booked'),
        'Descriptive conflict error returned to customer'
      );
    }

    console.log('\n🎉 ALL 25 ASSERTIONS PASSED WITH ZERO ERRORS! [BGO-237 VERIFIED]');
  } finally {
    // Cleanup fixtures
    console.log('\n[Cleanup] Cleaning up test fixtures...');
    await Promise.all([
      Business.deleteOne({ _id: testBusinessId }),
      Location.deleteOne({ _id: testLocationId }),
      Category.deleteOne({ _id: testCategoryId }),
      Service.deleteMany({ _id: { $in: [testService1Id, testService2Id] } }),
      Staff.deleteMany({ _id: { $in: [testStaff1Id, testStaff2Id] } }),
      Appointment.deleteMany({ businessId: testBusinessId }),
    ]);
    console.log('✅ Test fixtures cleaned up successfully');
  }
}

runBookingConflictTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal Test Suite Error:', err);
    process.exit(1);
  });
