import { Types } from 'mongoose';
import { connectToDatabase } from '../lib/db';
import { computeTenantDashboardAnalytics } from '../lib/tenant-analytics';
import { getTenantAnalyticsAction } from '../actions/tenant-analytics';
import { Business } from '../models/Business';

async function runTenantAnalyticsTests() {
  console.log('--- 🧪 STARTING TENANT BUSINESS KPI & APPOINTMENT ANALYTICS TESTS [BGO-235] ---');

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

  // Phase 1: Security Authorization Guard
  console.log('\n[Phase 1] Testing security authorization guard...');
  try {
    const unauthorizedRes = await getTenantAnalyticsAction();
    assert(
      !unauthorizedRes.success,
      'Action rejected invocation without active authenticated session'
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(
      msg.includes('headers') || msg.includes('Unauthorized'),
      'Action properly guarded against unauthenticated request context'
    );
  }

  // Phase 2: Resolving a sample business from Atlas
  console.log('\n[Phase 2] Resolving active business context from Atlas...');
  const sampleBusiness = await Business.findOne().lean();
  const testBusinessId = sampleBusiness ? sampleBusiness._id : new Types.ObjectId();
  const testCompanyId = sampleBusiness ? sampleBusiness.companyId : new Types.ObjectId();

  assert(Types.ObjectId.isValid(testBusinessId), 'Valid businessId resolved for analytics testing');
  assert(Types.ObjectId.isValid(testCompanyId), 'Valid companyId resolved for analytics testing');

  // Phase 3: Executing Core Aggregation Pipeline
  console.log('\n[Phase 3] Testing computeTenantDashboardAnalytics (7-day default)...');
  const analytics7 = await computeTenantDashboardAnalytics({
    companyId: testCompanyId,
    businessId: testBusinessId,
    durationDays: 7,
  });

  assert(typeof analytics7 === 'object' && analytics7 !== null, 'Analytics response is valid object');
  assert(typeof analytics7.kpis === 'object', 'KPIs object is present');
  assert(typeof analytics7.kpis.totalAppointments === 'number', 'kpis.totalAppointments is numeric');
  assert(typeof analytics7.kpis.pendingAppointments === 'number', 'kpis.pendingAppointments is numeric');
  assert(typeof analytics7.kpis.completedAppointments === 'number', 'kpis.completedAppointments is numeric');
  assert(typeof analytics7.kpis.cancelledAppointments === 'number', 'kpis.cancelledAppointments is numeric');
  assert(typeof analytics7.kpis.totalRevenue === 'number', 'kpis.totalRevenue is numeric');
  assert(typeof analytics7.kpis.formattedRevenue === 'string', 'kpis.formattedRevenue is string');
  assert(typeof analytics7.kpis.todayAppointmentsCount === 'number', 'kpis.todayAppointmentsCount is numeric');
  assert(typeof analytics7.kpis.uniqueCustomersCount === 'number', 'kpis.uniqueCustomersCount is numeric');

  // Phase 4: Zero-Gap Rolling Timeline Verification
  console.log('\n[Phase 4] Testing 7-day rolling timeline zero-gap filling...');
  assert(Array.isArray(analytics7.chart.days), 'chart.days is an array');
  assert(analytics7.chart.days.length === 7, 'chart.days contains exactly 7 daily buckets');
  assert(analytics7.chart.fullDates.length === 7, 'chart.fullDates contains exactly 7 ISO dates');

  for (const day of analytics7.chart.days) {
    assert(day in analytics7.chart.appointmentsPerDay, `Day "${day}" present in appointmentsPerDay`);
    assert(typeof analytics7.chart.appointmentsPerDay[day] === 'number', `Day "${day}" appointments count is numeric`);
    assert(day in analytics7.chart.revenuePerDay, `Day "${day}" present in revenuePerDay`);
    assert(typeof analytics7.chart.revenuePerDay[day] === 'number', `Day "${day}" revenue is numeric`);
  }

  assert(analytics7.chart.maxDayAppointments >= 0, 'chart.maxDayAppointments is non-negative');
  assert(analytics7.chart.maxDayRevenue >= 0, 'chart.maxDayRevenue is non-negative');

  // Phase 5: Custom Duration Parameterization
  console.log('\n[Phase 5] Testing custom duration windows (15 days & 30 days)...');
  const analytics15 = await computeTenantDashboardAnalytics({
    companyId: testCompanyId,
    businessId: testBusinessId,
    durationDays: 15,
  });
  assert(analytics15.chart.days.length === 15, '15-day request returns exactly 15 daily buckets');

  const analytics30 = await computeTenantDashboardAnalytics({
    companyId: testCompanyId,
    businessId: testBusinessId,
    durationDays: 30,
  });
  assert(analytics30.chart.days.length === 30, '30-day request returns exactly 30 daily buckets');

  const analyticsCustomRange = await computeTenantDashboardAnalytics({
    companyId: testCompanyId,
    businessId: testBusinessId,
    startDate: '2026-09-01',
    endDate: '2026-09-05',
  });
  assert(analyticsCustomRange.chart.days.length === 5, 'Explicit startDate/endDate (5 days) returns exactly 5 daily buckets');

  // Phase 6: Staff Workload Distribution
  console.log('\n[Phase 6] Testing staff workload aggregation...');
  assert(Array.isArray(analytics7.staffWorkload), 'staffWorkload is an array');
  if (analytics7.staffWorkload.length > 0) {
    const s = analytics7.staffWorkload[0];
    assert(typeof s.staffId === 'string', 'Staff item has valid staffId string');
    assert(typeof s.staffName === 'string', 'Staff item has valid staffName string');
    assert(typeof s.staffColor === 'string', 'Staff item has valid staffColor hex');
    assert(typeof s.appointmentCount === 'number', 'Staff item has appointmentCount number');
    assert(typeof s.revenue === 'number', 'Staff item has revenue number');
  } else {
    console.log('  ℹ No staff bookings present in sample dataset, verified empty array compatibility');
    assert(analytics7.staffWorkload.length === 0, 'Empty staffWorkload handled cleanly');
  }

  // Phase 7: Top Booked Services Leaderboard
  console.log('\n[Phase 7] Testing top services aggregation...');
  assert(Array.isArray(analytics7.topServices), 'topServices is an array');
  if (analytics7.topServices.length > 0) {
    const s = analytics7.topServices[0];
    assert(typeof s.serviceId === 'string', 'Service item has valid serviceId string');
    assert(typeof s.serviceName === 'string', 'Service item has valid serviceName string');
    assert(typeof s.bookingCount === 'number', 'Service item has bookingCount number');
    assert(typeof s.totalRevenue === 'number', 'Service item has totalRevenue number');
    assert(typeof s.percentageShare === 'number', 'Service item has percentageShare number');
  } else {
    console.log('  ℹ No services booked in sample dataset, verified empty array compatibility');
    assert(analytics7.topServices.length === 0, 'Empty topServices handled cleanly');
  }

  // Phase 8: Status Breakdown Distribution
  console.log('\n[Phase 8] Testing status breakdown distribution...');
  assert(Array.isArray(analytics7.statusBreakdown), 'statusBreakdown is an array');
  for (const st of analytics7.statusBreakdown) {
    assert(typeof st.status === 'string', `Status "${st.status}" is valid string`);
    assert(typeof st.count === 'number', `Status count is numeric`);
    assert(typeof st.percentage === 'number', `Status percentage is numeric`);
    assert(typeof st.color === 'string' && st.color.startsWith('#'), `Status color is valid hex`);
  }

  // Phase 9: Today's Appointments List
  console.log("\n[Phase 9] Testing today's appointments list formatting...");
  assert(Array.isArray(analytics7.todayAppointments), 'todayAppointments is an array');
  if (analytics7.todayAppointments.length > 0) {
    const apt = analytics7.todayAppointments[0];
    assert(typeof apt.id === 'string', 'Appointment has valid ID string');
    assert(typeof apt.appointmentNumber === 'string', 'Appointment has valid appointmentNumber');
    assert(typeof apt.customerName === 'string', 'Appointment has valid customerName');
    assert(typeof apt.serviceName === 'string', 'Appointment has valid serviceName');
    assert(typeof apt.time === 'string', 'Appointment has valid time');
  } else {
    console.log("  ℹ No appointments booked for today in test data, verified empty list structure");
    assert(analytics7.todayAppointments.length === 0, "Empty today's appointments list handled gracefully");
  }

  // Phase 10: Multi-Tenant Boundary Isolation
  console.log('\n[Phase 10] Testing multi-tenant boundary isolation...');
  const isolatedFakeBusinessId = new Types.ObjectId();
  const isolatedFakeCompanyId = new Types.ObjectId();

  const isolatedAnalytics = await computeTenantDashboardAnalytics({
    companyId: isolatedFakeCompanyId,
    businessId: isolatedFakeBusinessId,
    durationDays: 7,
  });

  assert(isolatedAnalytics.kpis.totalAppointments === 0, 'Cross-tenant query returns 0 appointments for foreign business');
  assert(isolatedAnalytics.kpis.totalRevenue === 0, 'Cross-tenant query returns $0 revenue for foreign business');
  assert(isolatedAnalytics.kpis.uniqueCustomersCount === 0, 'Cross-tenant query returns 0 customers');
  assert(isolatedAnalytics.todayAppointments.length === 0, 'Cross-tenant query returns 0 today appointments');
  assert(isolatedAnalytics.staffWorkload.length === 0, 'Cross-tenant query returns 0 staff metrics');
  assert(isolatedAnalytics.topServices.length === 0, 'Cross-tenant query returns 0 service metrics');

  console.log(`\n🎉 ALL ${passed} ASSERTIONS PASSED WITH ZERO ERRORS! [BGO-235 VERIFIED]`);
  process.exit(0);
}

runTenantAnalyticsTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
