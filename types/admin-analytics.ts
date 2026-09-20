export interface SuperAdminKPIDTO {
  totalUsers: number;
  paidUsers: number;
  totalOrders: number;
  totalRevenue: number;
  formattedRevenue: string;
  mrr: number;
  formattedMrr: string;
  arr: number;
  formattedArr: string;
  activePlansCount: number;
  popularPlanName: string;
  pendingBankTransfers: number;
}

export interface OrderTimelineChartDTO {
  days: string[];
  ordersPerDay: Record<string, number>;
  revenuePerDay: Record<string, number>;
  maxDayOrders: number;
  maxDayRevenue: number;
}

export interface PlanDistributionDTO {
  planId: string;
  planName: string;
  subscriberCount: number;
  percentage: number;
  monthlyPrice: number;
  yearlyPrice: number;
}

export interface RecentOrderSummaryDTO {
  id: string;
  orderNumber: string;
  companyName: string;
  companyEmail: string;
  planName: string;
  price: number;
  currency: string;
  billingCycle: string;
  paymentStatus: string;
  paymentType: string;
  createdAt: string;
}

export interface SuperAdminAnalyticsDTO {
  kpis: SuperAdminKPIDTO;
  chart: OrderTimelineChartDTO;
  planDistribution: PlanDistributionDTO[];
  recentOrders: RecentOrderSummaryDTO[];
}

export interface SuperAdminAnalyticsActionResult {
  success: boolean;
  data?: SuperAdminAnalyticsDTO;
  error?: string;
}
