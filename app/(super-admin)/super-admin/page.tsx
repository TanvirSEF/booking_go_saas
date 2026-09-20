import Link from "next/link";
import {
  IconLink,
  IconShare,
  IconUsers,
  IconShoppingCart,
  IconTrophy,
  IconAffiliate,
} from "@tabler/icons-react";
import { getSuperAdminAnalyticsAction } from "@/actions/admin-analytics";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RecentOrdersChart } from "@/components/super-admin/recent-orders-chart";
import { LandingQrCard } from "@/components/super-admin/landing-qr-card";

export const metadata = {
  title: "Dashboard | Super Admin",
};

export default async function SuperAdminDashboardPage() {
  const analyticsRes = await getSuperAdminAnalyticsAction({ chartDays: 15 });
  
  // Fallbacks if analytics call returns an error or is uninitialized
  const kpis = analyticsRes.data?.kpis ?? {
    totalUsers: 0,
    paidUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    formattedRevenue: "$0.00",
    mrr: 0,
    formattedMrr: "$0.00",
    arr: 0,
    formattedArr: "$0.00",
    activePlansCount: 0,
    popularPlanName: "Basic Plan",
    pendingBankTransfers: 0,
  };

  const chart = analyticsRes.data?.chart ?? {
    days: [],
    ordersPerDay: {},
    revenuePerDay: {},
    maxDayOrders: 0,
    maxDayRevenue: 0,
  };

  const totalUsers = kpis.totalUsers;
  const paidUsers = kpis.paidUsers;
  const totalOrders = kpis.totalOrders;
  const formattedOrderAmount = kpis.formattedRevenue;
  const activePlans = kpis.activePlansCount;
  const chartDays = chart.days;

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <h1 className="text-xl font-bold tracking-tight text-foreground">
        Dashboard
      </h1>

      {/* Top Section: 5 Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
        {/* 1. Super Admin Welcome Banner */}
        <Card className="relative flex min-h-[180px] flex-col justify-between overflow-hidden rounded-2xl border-none bg-[#072a33] p-5 shadow-xs lg:col-span-4">
          <div className="relative z-10 flex flex-col gap-2">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Super Admin
            </h2>
            <p className="max-w-[210px] text-xs leading-relaxed text-slate-300">
              The keys to the kingdom are in your hands – welcome to your Super Admin Dashboard!
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
            >
              <Link href="/" target="_blank">
                <IconLink size={14} />
                <span>Landing Page</span>
              </Link>
            </Button>
            <Button
              size="icon"
              className="size-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              title="Share"
            >
              <IconShare size={14} />
            </Button>
          </div>

          {/* Connected Network Graphic */}
          <div className="pointer-events-none absolute -right-4 -bottom-4 flex size-36 items-center justify-center rounded-full bg-[#0d4738]/50">
            <div className="flex size-24 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10 text-emerald-400">
              <IconAffiliate size={42} stroke={1.8} />
            </div>
          </div>
        </Card>

        {/* 2. QR Code Card (Using qrcode package) */}
        <LandingQrCard />

        {/* 3. Total Users Card */}
        <Card className="relative flex min-h-[180px] flex-col justify-between overflow-hidden rounded-2xl border-none bg-[#fee9ee] p-5 shadow-xs lg:col-span-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-white shadow-2xs text-[#f43f5e]">
                <IconUsers size={18} stroke={2} />
              </div>
              <div className="size-4 rounded-full bg-[#fbcfe8]" />
              <div className="size-3 rounded-full bg-[#fbcfe8]" />
            </div>
            <span className="text-2xl font-bold text-slate-800">
              {totalUsers}
            </span>
          </div>

          <div className="relative z-10 flex flex-col gap-1">
            <span className="text-base font-bold text-[#f43f5e]">
              Total Users
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[#f43f5e]/80">
                Paid Users
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {paidUsers}
              </span>
            </div>
          </div>

          {/* Bottom-right circular decoration */}
          <div className="pointer-events-none absolute -right-6 -bottom-6 size-20 rounded-full bg-[#f43f5e]/50" />
        </Card>

        {/* 4. Total Orders Card */}
        <Card className="relative flex min-h-[180px] flex-col justify-between overflow-hidden rounded-2xl border-none bg-[#def4ec] p-5 shadow-xs lg:col-span-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-white shadow-2xs text-[#0d9488]">
                <IconShoppingCart size={18} stroke={2} />
              </div>
              <div className="size-4 rounded-full bg-[#a7f3d0]" />
              <div className="size-3 rounded-full bg-[#a7f3d0]" />
            </div>
            <span className="text-2xl font-bold text-slate-800">
              {totalOrders}
            </span>
          </div>

          <div className="relative z-10 flex flex-col gap-1">
            <span className="text-base font-bold text-[#0d9488]">
              Total Orders
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[#0d9488]/80">
                Order Amount (MRR: {kpis.formattedMrr})
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {formattedOrderAmount}
              </span>
            </div>
          </div>

          {/* Bottom-right circular decoration */}
          <div className="pointer-events-none absolute -right-6 -bottom-6 size-20 rounded-full bg-[#10b981]/50" />
        </Card>

        {/* 5. Total Plans Card */}
        <Card className="relative flex min-h-[180px] flex-col justify-between overflow-hidden rounded-2xl border-none bg-[#fff2e2] p-5 shadow-xs lg:col-span-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-white shadow-2xs text-[#ea580c]">
                <IconTrophy size={18} stroke={2} />
              </div>
              <div className="size-4 rounded-full bg-[#fed7aa]" />
              <div className="size-3 rounded-full bg-[#fed7aa]" />
            </div>
            <span className="text-2xl font-bold text-slate-800">
              {activePlans}
            </span>
          </div>

          <div className="relative z-10 flex flex-col gap-1">
            <span className="text-base font-bold text-[#ea580c]">
              Total Plans
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[#ea580c]/80">
                Popular Plan
              </span>
              <span className="text-sm font-semibold text-slate-800 truncate" title={kpis.popularPlanName}>
                {kpis.popularPlanName}
              </span>
            </div>
          </div>

          {/* Bottom-right circular decoration */}
          <div className="pointer-events-none absolute -right-6 -bottom-6 size-20 rounded-full bg-[#f97316]/50" />
        </Card>
      </div>

      {/* Pending Bank Transfers Notification Banner */}
      {kpis.pendingBankTransfers > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <span className="flex size-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-medium">
              You have <strong>{kpis.pendingBankTransfers}</strong> pending bank transfer payment verification(s) waiting for review.
            </span>
          </div>
          <Button asChild size="sm" variant="outline" className="h-8 border-amber-300 bg-white text-xs hover:bg-amber-100 dark:bg-amber-900 dark:hover:bg-amber-800">
            <Link href="/super-admin/bank-transfers">Review Payments</Link>
          </Button>
        </div>
      )}

      {/* Section 2: Recent Order */}
      <div className="mt-2 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Recent Order
          </h2>
          <span className="text-[11px] font-medium text-muted-foreground sm:hidden">
            Scroll horizontally &rarr;
          </span>
        </div>

        <RecentOrdersChart chartDays={chartDays} ordersPerDay={chart.ordersPerDay} />
      </div>
    </div>
  );
}
