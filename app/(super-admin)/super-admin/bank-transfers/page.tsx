import React from "react";
import { Metadata } from "next";
import { requireRole } from "@/lib/guards";
import { ACCESS } from "@/lib/roles";
import { getBankTransferRequestsAction } from "@/actions/bank-transfer";
import { BankTransfersTable } from "@/components/super-admin/bank-transfers/bank-transfers-table";
import { Card, CardContent } from "@/components/ui/card";
import {
  IconClock,
  IconCircleCheck,
  IconCircleX,
  IconBuildingBank,
} from "@tabler/icons-react";
import type { BankTransferStatus } from "@/types/bank-transfer";

export const metadata: Metadata = {
  title: "Bank Transfer Requests | Super Admin",
  description:
    "Review and verify tenant offline wire transfer payments for subscription plan activations.",
};

interface BankTransfersPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function SuperAdminBankTransfersPage({
  searchParams,
}: BankTransfersPageProps) {
  // 1. RBAC Guard: Super Admin allowlist only
  await requireRole(ACCESS.superAdmin, "/super-admin/bank-transfers");

  // 2. Resolve Search Parameters
  const resolvedParams = await searchParams;
  const statusParam = (resolvedParams.status as BankTransferStatus | "all") || "Pending";
  const search = resolvedParams.search || "";
  const page = Math.max(1, parseInt(resolvedParams.page || "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(resolvedParams.limit || "10", 10) || 10));

  // 3. Fetch Data on Server
  const res = await getBankTransferRequestsAction({
    status: statusParam,
    search,
    page,
    limit,
  });

  const data = res.data || {
    items: [],
    total: 0,
    page: 1,
    totalPages: 1,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
  };

  const metricCards = [
    {
      title: "Pending Verification",
      count: data.pendingCount,
      icon: IconClock,
      textColor: "text-amber-700 dark:text-amber-400",
      bgColor: "bg-amber-500/10 border-amber-500/20",
      badgeDesc: "Action required",
    },
    {
      title: "Approved Transfers",
      count: data.approvedCount,
      icon: IconCircleCheck,
      textColor: "text-emerald-700 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10 border-emerald-500/20",
      badgeDesc: "Plans activated",
    },
    {
      title: "Rejected Requests",
      count: data.rejectedCount,
      icon: IconCircleX,
      textColor: "text-rose-700 dark:text-rose-400",
      bgColor: "bg-rose-500/10 border-rose-500/20",
      badgeDesc: "Failed verification",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs shrink-0">
              <IconBuildingBank size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Bank Transfer Verifications
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Inspect offline bank wire receipts, review payment details, and activate tenant subscriptions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className="border-border bg-card shadow-xs rounded-xl overflow-hidden"
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-foreground">
                      {card.count.toLocaleString()}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {card.badgeDesc}
                    </span>
                  </div>
                </div>

                <div
                  className={`size-10 rounded-xl flex items-center justify-center border shrink-0 ${card.bgColor} ${card.textColor}`}
                >
                  <Icon size={20} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Requests Data Table */}
      <BankTransfersTable
        items={data.items}
        total={data.total}
        page={data.page}
        limit={limit}
        totalPages={data.totalPages}
        pendingCount={data.pendingCount}
        approvedCount={data.approvedCount}
        rejectedCount={data.rejectedCount}
        currentStatus={statusParam}
        currentSearch={search}
      />
    </div>
  );
}
