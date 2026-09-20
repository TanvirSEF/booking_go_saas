import { connectToDatabase } from '../lib/db';
import { computeSuperAdminAnalytics } from '../lib/admin-analytics';
import { getSuperAdminAnalyticsAction } from '../actions/admin-analytics';

async function runAdminAnalyticsTests() {
  console.log('--- 🧪 STARTING SUPER ADMIN FINANCIAL ANALYTICS TESTS [BGO-234] ---');

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

  // ----------------------------------------------------
  // PHASE 1: Security Authorization Check
  // ----------------------------------------------------
  console.log('\n[Phase 1] Testing Super Admin security authorization guard...');
  const unauthorizedCheck = await getSuperAdminAnalyticsAction();
  assert(
    unauthorizedCheck.success === false,
    'Action rejected unauthorized invocation without active Super Admin session'
  );
  console.log('  unauthorizedCheck error:', unauthorizedCheck.error);
  assert(
    Boolean(unauthorizedCheck.error),
    'Appropriate unauthorized error message returned'
  );

  // ----------------------------------------------------
  // PHASE 2: Pipeline Execution & KPI Verification
  // ----------------------------------------------------
  console.log('\n[Phase 2] Executing live aggregation pipeline...');
  const analytics = await computeSuperAdminAnalytics({ chartDays: 15 });
  assert(Boolean(analytics), 'Analytics DTO returned from aggregation pipeline');
  assert(Boolean(analytics.kpis), 'KPIs object present in response');

  const { kpis, chart, planDistribution, recentOrders } = analytics;

  // Verify KPI fields
  assert(typeof kpis.totalUsers === 'number' && kpis.totalUsers >= 0, 'kpis.totalUsers is valid number');
  assert(typeof kpis.paidUsers === 'number' && kpis.paidUsers >= 0, 'kpis.paidUsers is valid number');
  assert(typeof kpis.totalOrders === 'number' && kpis.totalOrders >= 0, 'kpis.totalOrders is valid number');
  assert(typeof kpis.totalRevenue === 'number' && kpis.totalRevenue >= 0, 'kpis.totalRevenue is valid number');
  assert(typeof kpis.mrr === 'number' && kpis.mrr >= 0, 'kpis.mrr is valid number');
  assert(
    kpis.arr === Number((kpis.mrr * 12).toFixed(2)),
    'kpis.arr is exactly 12x MRR'
  );
  assert(typeof kpis.formattedRevenue === 'string' && kpis.formattedRevenue.startsWith('$'), 'kpis.formattedRevenue is formatted string');
  assert(typeof kpis.popularPlanName === 'string', 'kpis.popularPlanName is string');
  assert(typeof kpis.pendingBankTransfers === 'number' && kpis.pendingBankTransfers >= 0, 'kpis.pendingBankTransfers is valid number');

  // ----------------------------------------------------
  // PHASE 3: Zero-Gap Rolling Timeline Verification
  // ----------------------------------------------------
  console.log('\n[Phase 3] Testing 15-day rolling timeline zero-gap bucket filling...');
  assert(chart.days.length === 15, 'chart.days contains exactly 15 days');
  
  for (const day of chart.days) {
    assert(day in chart.ordersPerDay, `Day "${day}" is present in ordersPerDay`);
    assert(day in chart.revenuePerDay, `Day "${day}" is present in revenuePerDay`);
    assert(typeof chart.ordersPerDay[day] === 'number', `Day "${day}" order count is numeric`);
    assert(typeof chart.revenuePerDay[day] === 'number', `Day "${day}" revenue amount is numeric`);
  }

  assert(chart.maxDayOrders >= 0, 'chart.maxDayOrders is non-negative number');
  assert(chart.maxDayRevenue >= 0, 'chart.maxDayRevenue is non-negative number');

  // ----------------------------------------------------
  // PHASE 4: Custom Range Flexibility (e.g. 7 days)
  // ----------------------------------------------------
  console.log('\n[Phase 4] Testing custom rolling range (7 days)...');
  const weeklyAnalytics = await computeSuperAdminAnalytics({ chartDays: 7 });
  assert(weeklyAnalytics.chart.days.length === 7, '7-day range returns exactly 7 days');

  // ----------------------------------------------------
  // PHASE 5: Plan Distribution Verification
  // ----------------------------------------------------
  console.log('\n[Phase 5] Testing plan distribution calculations...');
  assert(Array.isArray(planDistribution), 'planDistribution is an array');
  if (planDistribution.length > 0) {
    const topPlan = planDistribution[0];
    assert(Boolean(topPlan.planName), 'Plan item has valid name');
    assert(typeof topPlan.subscriberCount === 'number', 'Subscriber count is number');
    assert(typeof topPlan.percentage === 'number', 'Percentage is number');
  }

  // ----------------------------------------------------
  // PHASE 6: Recent Orders List
  // ----------------------------------------------------
  console.log('\n[Phase 6] Testing recent orders list formatting...');
  assert(Array.isArray(recentOrders), 'recentOrders is an array');
  assert(recentOrders.length <= 10, 'recentOrders limited to maximum 10 items');

  console.log(`\n🎉 ALL ${passed} ASSERTIONS PASSED WITH ZERO ERRORS! [BGO-234 VERIFIED]`);
}

runAdminAnalyticsTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
