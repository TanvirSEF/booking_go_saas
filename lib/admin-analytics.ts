import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Plan, type IPlanDocument } from '@/models/Plan';
import { Order, type IOrderDocument } from '@/models/Order';
import { BankTransferPayment } from '@/models/BankTransferPayment';
import type {
  SuperAdminAnalyticsDTO,
  OrderTimelineChartDTO,
  PlanDistributionDTO,
  RecentOrderSummaryDTO,
} from '@/types/admin-analytics';

function formatDayLabel(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const month = monthNames[date.getMonth()];
  return `${day}-${month}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Pure aggregation pipeline for Super Admin SaaS Financial Analytics.
 * Computes live MRR, ARR, zero-gap rolling order timelines, plan distributions,
 * and pending bank transfer verification queues.
 */
export async function computeSuperAdminAnalytics(options?: {
  chartDays?: number;
}): Promise<SuperAdminAnalyticsDTO> {
  await connectToDatabase();

  const chartDaysCount = Math.max(7, Math.min(60, options?.chartDays ?? 15));
  const now = new Date();

  // 1. Generate continuous zero-gap rolling date timeline
  const days: string[] = [];
  const ordersPerDay: Record<string, number> = {};
  const revenuePerDay: Record<string, number> = {};

  for (let i = chartDaysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = formatDayLabel(d);
    days.push(label);
    ordersPerDay[label] = 0;
    revenuePerDay[label] = 0;
  }

  const timelineStartDate = new Date(now);
  timelineStartDate.setDate(timelineStartDate.getDate() - (chartDaysCount - 1));
  timelineStartDate.setHours(0, 0, 0, 0);

  // 2. Parallel Database Aggregations
  const [
    totalUsers,
    companiesWithPlans,
    totalOrdersCount,
    orderTotalsAgg,
    activePlansCount,
    pendingBankTransfers,
    timelineOrdersData,
    rawRecentOrders,
  ] = await Promise.all([
    User.countDocuments({ role: 'company' }),
    User.find({
      role: 'company',
      isActive: { $ne: false },
      activePlanId: { $ne: null },
    })
      .populate<{ activePlanId: IPlanDocument }>(
        'activePlanId',
        'name packagePriceMonthly packagePriceYearly isFreePlan'
      )
      .lean(),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { paymentStatus: { $in: ['succeeded', 'Approved'] } } },
      { $group: { _id: null, totalAmount: { $sum: '$price' }, completedCount: { $sum: 1 } } },
    ]),
    Plan.countDocuments({ isEnabled: true }),
    BankTransferPayment.countDocuments({ type: 'plan', status: 'Pending' }),
    Order.find({
      createdAt: { $gte: timelineStartDate },
      paymentStatus: { $in: ['succeeded', 'Approved'] },
    })
      .select('price createdAt')
      .lean(),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate<{ companyId: { name: string; email: string } }>('companyId', 'name email')
      .populate<{ planId: { name: string } }>('planId', 'name')
      .lean(),
  ]);

  // 3. Populate Zero-Gap Rolling Timeline
  for (const ord of timelineOrdersData) {
    const label = formatDayLabel(new Date(ord.createdAt));
    if (ordersPerDay[label] !== undefined) {
      ordersPerDay[label] += 1;
      revenuePerDay[label] = Number(
        ((revenuePerDay[label] || 0) + (ord.price || 0)).toFixed(2)
      );
    }
  }

  const maxDayOrders = Math.max(...Object.values(ordersPerDay), 0);
  const maxDayRevenue = Math.max(...Object.values(revenuePerDay), 0);

  const chart: OrderTimelineChartDTO = {
    days,
    ordersPerDay,
    revenuePerDay,
    maxDayOrders,
    maxDayRevenue,
  };

  // 4. Compute MRR, ARR, and Plan Distributions
  let mrr = 0;
  let paidUsers = 0;
  const planCounts = new Map<
    string,
    {
      name: string;
      count: number;
      monthlyPrice: number;
      yearlyPrice: number;
    }
  >();

  for (const comp of companiesWithPlans) {
    const plan = comp.activePlanId;
    if (!plan) continue;

    const planIdStr = String(plan._id);
    const existing = planCounts.get(planIdStr) || {
      name: plan.name,
      count: 0,
      monthlyPrice: plan.packagePriceMonthly ?? 0,
      yearlyPrice: plan.packagePriceYearly ?? 0,
    };
    existing.count += 1;
    planCounts.set(planIdStr, existing);

    // Check paid status
    if (!plan.isFreePlan && (plan.packagePriceMonthly || plan.packagePriceYearly)) {
      paidUsers += 1;
      if (comp.billingType === 'yearly') {
        const yearlyP = plan.packagePriceYearly || (plan.packagePriceMonthly * 12);
        mrr += yearlyP / 12;
      } else {
        mrr += plan.packagePriceMonthly || 0;
      }
    }
  }

  mrr = Number(mrr.toFixed(2));
  const arr = Number((mrr * 12).toFixed(2));

  // 5. Popular Plan & Distribution Percentage
  let popularPlanName = 'Basic Plan';
  let maxSubscribers = -1;
  const planDistribution: PlanDistributionDTO[] = [];
  const totalSubscribers = companiesWithPlans.length;

  for (const [planId, data] of planCounts.entries()) {
    if (data.count > maxSubscribers) {
      maxSubscribers = data.count;
      popularPlanName = data.name;
    }
    planDistribution.push({
      planId,
      planName: data.name,
      subscriberCount: data.count,
      percentage:
        totalSubscribers > 0
          ? Number(((data.count / totalSubscribers) * 100).toFixed(1))
          : 0,
      monthlyPrice: data.monthlyPrice,
      yearlyPrice: data.yearlyPrice,
    });
  }
  planDistribution.sort((a, b) => b.subscriberCount - a.subscriberCount);

  // 6. Overall Revenue & Formatting
  const totalRevenue = orderTotalsAgg[0]?.totalAmount
    ? Number(orderTotalsAgg[0].totalAmount.toFixed(2))
    : 0;

  // 7. Recent Orders Formatting
  const recentOrders: RecentOrderSummaryDTO[] = (rawRecentOrders as unknown as Array<
    IOrderDocument & {
      companyId?: { name?: string; email?: string };
      planId?: { name?: string };
    }
  >).map((ord) => ({
    id: String(ord._id),
    orderNumber: ord.orderNumber,
    companyName: ord.companyId?.name || 'Company',
    companyEmail: ord.companyId?.email || '',
    planName: ord.planId?.name || ord.planName || 'Standard Plan',
    price: ord.price,
    currency: ord.currency || 'USD',
    billingCycle: ord.billingCycle || 'monthly',
    paymentStatus: ord.paymentStatus,
    paymentType: ord.paymentType || 'Stripe',
    createdAt: ord.createdAt ? new Date(ord.createdAt).toISOString() : new Date().toISOString(),
  }));

  return {
    kpis: {
      totalUsers,
      paidUsers,
      totalOrders: totalOrdersCount,
      totalRevenue,
      formattedRevenue: formatCurrency(totalRevenue),
      mrr,
      formattedMrr: formatCurrency(mrr),
      arr,
      formattedArr: formatCurrency(arr),
      activePlansCount,
      popularPlanName,
      pendingBankTransfers,
    },
    chart,
    planDistribution,
    recentOrders,
  };
}
